import {
  deleteDatabase,
  resetDatabase,
  createSqliteConnection
} from '../cache/db'
import { getConnection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../cache/entities'
import Cache, { ICache } from '../cache'
import { addMinutes } from 'date-fns'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import OneShotSchedule, { IProvider } from '../provider'
import Core from './index'

jest.setTimeout(17000)

const BLOCKCHAIN_URL = 'http://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

const DB_NAME = 'test_db_service'

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

describe('Core', function (this: {
  cache: ICache;
  provider: IProvider;
  repository: Repository<ScheduledTransaction>;
  oneShotScheduleContract: any;
  txOptions: { from: string };
  web3: Web3;
  scheduleTransaction: (gas: number, timestamp: Date) => Promise<void>;
}) {
  afterEach(async () => {
    await resetDatabase(getConnection())
    await deleteDatabase(getConnection(), DB_NAME)
  })
  beforeEach(async () => {
    const connection = await createSqliteConnection(DB_NAME)

    this.repository = connection.getRepository(ScheduledTransaction)

    this.cache = new Cache(this.repository)

    // ---
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

    this.provider = new OneShotSchedule(this.oneShotScheduleContract.options.address)
  })

  test('Should sync transactions after a restart', async () => {
    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(50000, addMinutes(new Date(), -2))
    }

    const service = new Core(this.provider, this.cache)

    await service.start()

    const firstCount = await this.repository.count()

    expect(firstCount).toBe(2)

    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(50000, addMinutes(new Date(), -2))
    }

    const secondCount = await this.repository.count()

    expect(secondCount).toBe(4)

    await service.stop()
  })

  test('Should cache new scheduled transactions', async () => {
    const service = new Core(this.provider, this.cache)

    await service.start()

    for (let i = 0; i < 2; i++) {
      await this.scheduleTransaction(50000, addMinutes(new Date(), -2))
    }

    const count = await this.repository.count()

    expect(count).toBe(2)

    await service.stop()
  })
})
