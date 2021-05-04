import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import TransactionExecutor from '../model/Executor'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import { addMinutes } from 'date-fns'
import { time } from '@openzeppelin/test-helpers'
import HDWalletProvider from '@truffle/hdwallet-provider'
import IMetatransaction, { EMetatransactionStatus } from '../IMetatransaction'
import parseEvent from '../model/parseEvent'
import {
  deleteDatabase,
  resetDatabase,
  createDbConnection
} from '../cache/db'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../cache/entities'
import Cache from '../cache/Cache'
import TransactionCollector from './Collector'

const { toBN } = Web3.utils

jest.setTimeout(17000)

const BLOCKCHAIN_HTTP_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"
const MNEMONIC_PHRASE = 'foil faculty bag wealth dish hover pride refuse lottery appear west chat'
const DB_NAME = 'test_db_collector'

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

const getMethodSigIncData = (web3) => web3.utils.sha3('inc()').slice(0, 10)

describe('TransactionsCollector', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
  oneShotScheduleContract: any;
  token: any;
  counter: any;
  txOptions: { from: string };
  plans: any[],
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<IMetatransaction>;
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

    this.cache = new Cache(this.repository)

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
      const receipt = await this.oneShotScheduleContract.methods
        .schedule(plan, to, data, gas, timestampContract)
        .send({ ...this.txOptions, value, gas: scheduleGas })

      return parseEvent(receipt.events.MetatransactionAdded)
    }

    // send balance to provider account - needs refactor
    const providerWalletWeb3 = new HDWalletProvider({
      mnemonic: MNEMONIC_PHRASE,
      providerOrUrl: BLOCKCHAIN_HTTP_URL,
      numberOfAddresses: 1,
      shareNonce: true,
      derivationPath: "m/44'/137'/0'/0/"
    })
    const serviceProviderWeb3 = new Web3(providerWalletWeb3)
    const [serviceProviderAccount] = await serviceProviderWeb3.eth.getAccounts()
    await this.web3.eth.sendTransaction({ to: serviceProviderAccount, value: '1000000000000000000' })
    providerWalletWeb3.engine.stop()
  })

  test('Should collect and execute cached tx`s', async () => {
    const CONFIRMATIONS_REQUIRED = 1
    const DIFF_MINUTES = 15

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), DIFF_MINUTES)

    const transaction = await this.scheduleTransaction(0, incData, toBN(0), timestamp)

    await this.cache.save({ ...transaction, timestamp: addMinutes(timestamp, -DIFF_MINUTES) })

    const txExecutor = new TransactionExecutor(
      this.oneShotScheduleContract.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE,
      BLOCKCHAIN_HTTP_URL
    )

    const executorExecuteSpied = jest.spyOn(txExecutor, 'execute')

    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    Date.now = jest.fn(() => +timestamp)
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    const collector = new TransactionCollector(this.cache, txExecutor)

    await collector.collectAndExecute()

    const cachedTx = await this.repository.findOne({
      where: {
        index: transaction.index
      }
    })

    expect(cachedTx).toBeDefined()
    expect(cachedTx?.status).toBe(EMetatransactionStatus.executed)
    expect(executorExecuteSpied).toBeCalledTimes(1)
  })
})
