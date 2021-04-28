import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import Provider, { TxMinimumConfirmationsRequiredError, TxAlreadyExecutedError, TxInvalidError } from './index'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import { addMinutes } from 'date-fns'
import loggerFactory from '../loggerFactory'
import { time } from '@openzeppelin/test-helpers'

const { toBN } = Web3.utils

jest.setTimeout(17000)

const BLOCKCHAIN_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

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

describe('OneShotSchedule', function (this: {
  oneShotScheduleContract: any;
  token: any;
  counter: any;
  txOptions: { from: string };
  plans: any[],
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<void>;
}) {
  beforeEach(async () => {
    this.web3 = new Web3(BLOCKCHAIN_URL)
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
  })

  test('Should get all past scheduled tx events', async () => {
    const NUMBER_OF_SCHEDULED_TX = 2
    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 5)

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      await this.scheduleTransaction(0, incData, toBN(0), timestamp)
    }

    // console.log(
    //   await this.oneShotScheduleContract.methods.getSchedule(0).call()
    // );

    const provider = new Provider(this.oneShotScheduleContract.options.address, 5)

    const result = await provider.getPastScheduledTransactions()

    expect(result.length).toBe(NUMBER_OF_SCHEDULED_TX)

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      expect(result[i].index).toBe(i)
      expect(result[i].blockNumber).toBeGreaterThan(0)
    }

    await provider.disconnect()
  })

  test('Should execute callback after schedule a new transaction', async (done) => {
    const provider = new Provider(this.oneShotScheduleContract.options.address, 5)

    provider.listenNewScheduledTransactions(async (event) => {
      expect(event).toBeDefined()
      expect(event.index).toBe(0)
      expect(event.blockNumber).toBeGreaterThan(0)
      await provider.disconnect()
      done()
    })

    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, getMethodSigIncData(this.web3), toBN(0), timestamp)
  })

  test('Should not execute new scheduled tx callback when disconnected', async () => {
    const logger = loggerFactory()
    const logErrorSpied = jest.spyOn(logger, 'error')

    const callback = jest.fn()

    const provider = new Provider(this.oneShotScheduleContract.options.address, 5)

    provider.disconnect()

    provider.listenNewScheduledTransactions(callback)

    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, getMethodSigIncData(this.web3), toBN(0), timestamp)

    expect(logErrorSpied).toHaveBeenCalledWith('The websocket connection is not opened', expect.anything())
    expect(callback).not.toBeCalled()
  })

  test('Should execute a scheduled tx', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, incData, toBN(0), timestamp)

    const provider = new Provider(this.oneShotScheduleContract.options.address, CONFIRMATIONS_REQUIRED)

    const [transaction] = await provider.getPastScheduledTransactions()

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await provider.executeTransaction(transaction)

    await provider.disconnect()
  })

  test('Should throw error when execute a scheduled tx without the confirmations required', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, incData, toBN(0), timestamp)

    const provider = new Provider(this.oneShotScheduleContract.options.address, CONFIRMATIONS_REQUIRED)

    const [transaction] = await provider.getPastScheduledTransactions()

    await expect(provider.executeTransaction(transaction))
      .rejects
      .toThrow(TxMinimumConfirmationsRequiredError)

    await provider.disconnect()
  })

  test('Should throw error when execute a scheduled tx twice', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, incData, toBN(0), timestamp)

    const provider = new Provider(this.oneShotScheduleContract.options.address, CONFIRMATIONS_REQUIRED)

    const [transaction] = await provider.getPastScheduledTransactions()

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await provider.executeTransaction(transaction)

    await expect(provider.executeTransaction(transaction))
      .rejects
      .toThrow(TxAlreadyExecutedError)

    await provider.disconnect()
  })

  test('Should throw error when execute an invalid scheduled tx', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const incData = getMethodSigIncData(this.web3)
    const timestamp = addMinutes(new Date(), 5)

    await this.scheduleTransaction(0, incData, toBN(0), timestamp)

    const provider = new Provider(this.oneShotScheduleContract.options.address, CONFIRMATIONS_REQUIRED)

    const [transaction] = await provider.getPastScheduledTransactions()

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    // emulate invalid tx
    transaction.from = 'changed-account'

    await expect(provider.executeTransaction(transaction))
      .rejects
      .toThrow(TxInvalidError)

    await provider.disconnect()
  })
})
