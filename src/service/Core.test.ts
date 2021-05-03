import {
  deleteDatabase,
  resetDatabase,
  createDbConnection
} from '../cache/db'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../cache/entities'
import Cache from '../cache/Cache'
import { addMinutes } from 'date-fns'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import { SchedulingsListener, SchedulingsRecoverer } from '../model'
import Core from './Core'

const { toBN } = Web3.utils

jest.setTimeout(27000)

const BLOCKCHAIN_HTTP_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"
const BLOCKCHAIN_WS_URL = 'ws://127.0.0.1:8545' // "wss://public-node.testnet.rsk.co"

const DB_NAME = 'test_db_service'

const getMethodSigIncData = (web3) => web3.utils.sha3('inc()').slice(0, 10)

const deployContract = async (
  web3: Web3,
  abi: AbiItem[],
  bytecode: string,
  args?: any[]
): Promise<Contract> => {
  const contract = new web3.eth.Contract(abi)
  const deployer = contract.deploy({ data: bytecode, arguments: args })

  const from = web3.eth.defaultAccount as string

  const gas = await deployer.estimateGas({ from })

  return new Promise((resolve, reject) =>
    deployer
      .send({ from, gas })
      .on('error', (error: Error) => reject(error))
      .then((newContractInstance: Contract) => resolve(newContractInstance))
  )
}

describe('Core', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
  oneShotScheduleContract: any;
  token: any;
  counter: any;
  txOptions: { from: string };
  plans: any[],
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<void>;
  core: Core
}) {
  afterEach(async () => {
    if (this.dbConnection && this.dbConnection.isConnected) {
      await resetDatabase(this.dbConnection)
      await deleteDatabase(this.dbConnection, DB_NAME)
    }
  })
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)

    this.repository = this.dbConnection.getRepository(ScheduledTransaction)

    this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)
    const [from] = await this.web3.eth.getAccounts()
    this.txOptions = { from }
    this.web3.eth.defaultAccount = from
    this.plans = [
      { price: toBN(15), window: toBN(10000) },
      { price: toBN(4), window: toBN(300) }
    ]

    this.token = await deployContract(
      this.web3,
      ERC677Data.abi as AbiItem[],
      ERC677Data.bytecode,
      [from, toBN('1000000000000000000000'), 'RIFOS', 'RIF']
    )

    // console.log('balance',
    //   await this.token.methods.balanceOf(from).call()
    // )

    this.counter = await deployContract(
      this.web3,
      CounterData.abi as AbiItem[],
      CounterData.bytecode,
      []
    )

    this.oneShotScheduleContract = await deployContract(
      this.web3,
      OneShotScheduleData.abi as AbiItem[],
      OneShotScheduleData.bytecode,
      [this.token.options.address, from]
    )

    const addPlanGas = await this.oneShotScheduleContract.methods
      .addPlan(this.plans[0].price, this.plans[0].window)
      .estimateGas()
    await this.oneShotScheduleContract.methods
      .addPlan(this.plans[0].price, this.plans[0].window)
      .send({ ...this.txOptions, gas: addPlanGas })

    this.scheduleTransaction = async (plan: number, data: any, value: any, timestamp: Date) => {
      const timestampContract = toBN(
        Math.floor(+timestamp / 1000)
      )

      const to = this.counter.options.address
      const gas = toBN(await this.counter.methods.inc().estimateGas())

      const approveGas = await this.token.methods
        .approve(this.oneShotScheduleContract.options.address, this.plans[plan].price)
        .estimateGas()
      await this.token.methods
        .approve(this.oneShotScheduleContract.options.address, this.plans[plan].price)
        .send({ ...this.txOptions, gas: approveGas })

      const purchaseGas = await this.oneShotScheduleContract.methods
        .purchase(plan, toBN(1))
        .estimateGas()
      await this.oneShotScheduleContract.methods
        .purchase(plan, toBN(1))
        .send({ ...this.txOptions, gas: purchaseGas })

      const scheduleGas = await this.oneShotScheduleContract.methods
        .schedule(plan, to, data, gas, timestampContract)
        .estimateGas()
      await this.oneShotScheduleContract.methods
        .schedule(plan, to, data, gas, timestampContract)
        .send({ ...this.txOptions, value, gas: scheduleGas })
    }

    const cache = new Cache(this.repository)
    const listener = new SchedulingsListener(BLOCKCHAIN_WS_URL, this.oneShotScheduleContract.options.address)
    const recoverer = new SchedulingsRecoverer(BLOCKCHAIN_HTTP_URL, this.oneShotScheduleContract.options.address)

    this.core = new Core(recoverer, listener, cache)
  })

  test('Should sync transactions after a restart', async () => {
    // TODO: if we stop the service then fails to reconnect
    const incData = getMethodSigIncData(this.web3)
    const timestamp1 = addMinutes(new Date(), 15)

    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(0, incData, toBN(0), timestamp1)
    }

    await this.core.start()
    // await service.stop()

    await sleep(2000)
    const firstCount = await this.repository.count()

    expect(firstCount).toBe(2)

    const timestamp2 = addMinutes(new Date(), 15)
    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(0, incData, toBN(0), timestamp2)
    }

    // await this.core.start()

    await sleep(2000)
    const secondCount = await this.repository.count()

    expect(secondCount).toBe(4)

    await this.core.stop()
  })

  test('Should cache new scheduled transactions', async () => {
    await this.core.start()

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 15)

    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(0, incData, toBN(0), timestamp)
    }

    const count = await this.repository.count()

    expect(count).toBe(2)

    await this.core.stop()
  })
})

function sleep (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
