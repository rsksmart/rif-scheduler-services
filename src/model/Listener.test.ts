import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { Listener, newScheduledTransactionsError } from './Listener'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import { addMinutes } from 'date-fns'

const { toBN } = Web3.utils

jest.setTimeout(17000)

const BLOCKCHAIN_HTTP_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"
const BLOCKCHAIN_WS_URL = 'ws://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

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

describe('SchedulingsListener', function (this: {
  oneShotScheduleContract: any;
  token: any;
  counter: any;
  txOptions: { from: string };
  plans: any[],
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<void>;
}) {
  beforeEach(async () => {
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
  })

  test('Should execute callback after schedule a new transaction', async (done) => {
    const provider = new Listener(BLOCKCHAIN_WS_URL, this.oneShotScheduleContract.options.address)

    provider.listenNewScheduledTransactions(async (event) => {
      expect(event).toBeDefined()
      expect(event.index).toBe(0)
      expect(event.blockNumber).toBeGreaterThan(0)
      await provider.disconnect()
      done()
    })

    const timestamp = addMinutes(new Date(), 15)

    await this.scheduleTransaction(0, getMethodSigIncData(this.web3), toBN(0), timestamp)
  })

  test('Should not execute new scheduled tx callback when disconnected', async () => {
    expect.assertions(2)

    const callback = jest.fn()

    const listener = new Listener(BLOCKCHAIN_WS_URL, this.oneShotScheduleContract.options.address)

    listener.on(newScheduledTransactionsError, (error) => {
      expect(error.message).toEqual('connection not open on send()')
      expect(callback).not.toBeCalled()
    })

    listener.listenNewScheduledTransactions(callback)

    await listener.disconnect()

    const timestamp = addMinutes(new Date(), 15)

    await this.scheduleTransaction(0, getMethodSigIncData(this.web3), toBN(0), timestamp)
  })
})
