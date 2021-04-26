import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import Provider from './index'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import loggerFactory from '../loggerFactory'

jest.setTimeout(17000)

const BLOCKCHAIN_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

const FIVE_MINUTES_IN_SECONDS = 300

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

describe('OneShotSchedule', function (this: {
  oneShotScheduleContract: any;
  txOptions: { from: string };
  web3: Web3;
  scheduleTransaction: (gas: number, timestamp: Date) => Promise<void>;
}) {
  beforeEach(async () => {
    this.web3 = new Web3(BLOCKCHAIN_URL)
    const [from] = await this.web3.eth.getAccounts()
    this.txOptions = { from }
    this.web3.eth.defaultAccount = from

    this.oneShotScheduleContract = await deployContract(
      this.web3,
      OneShotScheduleData.abi as AbiItem[],
      OneShotScheduleData.bytecode,
      [FIVE_MINUTES_IN_SECONDS]
    )

    this.scheduleTransaction = async (gas: number, timestamp: Date) => {
      const timestampContract = this.web3.utils.toBN(
        Math.floor(+timestamp / 1000)
      )
      const gasContract = this.web3.utils.toBN(gas)

      const gasEstimated = await this.oneShotScheduleContract.methods
        .schedule(
          '0x33810883Af0dD41970E30A87982A5f6F71b7aE3E',
          '0x00',
          gasContract,
          timestampContract
        )
        .estimateGas()

      await this.oneShotScheduleContract.methods
        .schedule(
          '0x33810883Af0dD41970E30A87982A5f6F71b7aE3E',
          '0x00',
          gasContract,
          timestampContract
        )
        .send({ ...this.txOptions, gas: gasEstimated })
    }
  })

  test('Should listen to MetatransactionAdded past events', async () => {
    await this.scheduleTransaction(50000, new Date())

    // console.log(
    //   await this.oneShotScheduleContract.methods.getSchedule(0).call()
    // );

    const provider = new Provider(this.oneShotScheduleContract.options.address)

    const result = await provider.getPastScheduledTransactions()

    expect(result.length).toBe(1)

    await provider.disconnect()
  })

  test('Should listen to past events from 2 days ago to latest', async () => {
    const NUMBER_OF_SCHEDULED_TX = 2

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      await this.scheduleTransaction(50000, new Date())
    }

    // console.log(
    //   await this.oneShotScheduleContract.methods.getSchedule(0).call()
    // );

    const provider = new Provider(this.oneShotScheduleContract.options.address)

    const result = await provider.getPastScheduledTransactions()

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      expect(result[i].index).toBe(i)
      expect(result[i].blockNumber).toBeGreaterThan(0)
    }
    expect(result.length).toBe(NUMBER_OF_SCHEDULED_TX)

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

    await this.scheduleTransaction(50000, new Date())
  })

  test('Should not execute the callback when disconnected', async () => {
    const logger = loggerFactory()
    const logErrorSpied = jest.spyOn(logger, 'error')

    const callback = jest.fn()

    const provider = new Provider(this.oneShotScheduleContract.options.address)

    provider.disconnect()

    provider.listenNewScheduledTransactions(callback)

    await this.scheduleTransaction(50000, new Date())

    expect(logErrorSpied).toHaveBeenCalledWith('The websocket connection is not opened', expect.anything())
    expect(callback).not.toBeCalled()
  })
})
