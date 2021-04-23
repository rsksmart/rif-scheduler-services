import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import Provider from './index'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import plans from '../test-utils/plans'

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
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<void>;
}) {
  beforeEach(async () => {
    this.web3 = new Web3(BLOCKCHAIN_URL)
    const [from] = await this.web3.eth.getAccounts()
    this.txOptions = { from }
    this.web3.eth.defaultAccount = from

    this.token = await deployContract(
      this.web3,
      ERC677Data.abi as AbiItem[],
      ERC677Data.bytecode,
      [from, this.web3.utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF']
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

    await this.oneShotScheduleContract.methods
      .addPlan(plans[0].price, plans[0].window)
      .send({ ...this.txOptions })

    this.scheduleTransaction = async (plan: number, data: any, value: any, timestamp: Date) => {
      const timestampContract = this.web3.utils.toBN(
        Math.floor(+timestamp / 1000)
      )

      const to = this.counter.options.address
      const gas = this.web3.utils.toBN(await this.counter.methods.inc().estimateGas())

      const approveGas = await this.token.methods
        .approve(this.oneShotScheduleContract.options.address, plans[plan].price)
        .estimateGas()
      await this.token.methods
        .approve(this.oneShotScheduleContract.options.address, plans[plan].price)
        .send({ ...this.txOptions, gas: approveGas })

      const purchaseGas = await this.oneShotScheduleContract.methods
        .purchase(plan, this.web3.utils.toBN(1))
        .estimateGas()
      await this.oneShotScheduleContract.methods
        .purchase(plan, this.web3.utils.toBN(1))
        .send({ ...this.txOptions, gas: purchaseGas })

      const scheduleGas = await this.oneShotScheduleContract.methods
        .schedule(plan, to, data, gas, timestampContract)
        .estimateGas()
      await this.oneShotScheduleContract.methods
        .schedule(plan, to, data, gas, timestampContract)
        .send({ ...this.txOptions, value, gas: scheduleGas })
    }
  })

  test('Should get all past events', async () => {
    const NUMBER_OF_SCHEDULED_TX = 5

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      await this.scheduleTransaction(0, getMethodSigIncData(this.web3), this.web3.utils.toBN(0), new Date())
    }

    // console.log(
    //   await this.oneShotScheduleContract.methods.getSchedule(0).call()
    // );

    const provider = new Provider(this.oneShotScheduleContract.options.address)

    const result = await provider.getPastScheduledTransactions()

    expect(result.length).toBe(NUMBER_OF_SCHEDULED_TX)

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      expect(result[i].index).toBe(i)
      expect(result[i].blockNumber).toBeGreaterThan(0)
    }

    await provider.disconnect()
  })

  test('Should execute callback after schedule a new transaction', async (done) => {
    const provider = new Provider(this.oneShotScheduleContract.options.address)

    provider.listenNewScheduledTransactions(async (event) => {
      expect(event).toBeDefined()
      expect(event.index).toBe(0)
      expect(event.blockNumber).toBeGreaterThan(0)
      await provider.disconnect()
      done()
    })

    await this.scheduleTransaction(0, getMethodSigIncData(this.web3), this.web3.utils.toBN(0), new Date())
  })
})
