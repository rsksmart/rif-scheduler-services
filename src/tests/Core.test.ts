import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, getMethodSigIncData, resetDatabase, sleep } from './utils'
import { ISetup, setupContracts } from './setupContracts'
import { BLOCKCHAIN_HTTP_URL, BLOCKCHAIN_WS_URL } from './constants'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { addMinutes } from 'date-fns'
import Web3 from 'web3'
import { Recoverer } from '../Recoverer'
import { Listener } from '../Listener'
import Core from '../Core'
import { Collector } from '../Collector'
import { EMetatransactionStatus } from '../common/IMetatransaction'
import { ExecutorMock, SchedulerMock } from './mocks'
import mockDate from 'jest-mock-now'

const { toBN } = Web3.utils

jest.setTimeout(27000)

const DB_NAME = 'test_db_core'

describe('Core', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
  setup: ISetup
  core: Core,
  executorExecuteSpied: any,
  collectorCollectSinceSpied: any,
  schedulerStartSpied: any
}) {
  afterEach(async () => {
    if (this.dbConnection && this.dbConnection.isConnected) {
      await resetDatabase(this.dbConnection)
      await deleteDatabase(this.dbConnection, DB_NAME)
    }
    jest.clearAllMocks()
  })
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)

    this.repository = this.dbConnection.getRepository(ScheduledTransaction)

    this.setup = await setupContracts()

    this.cache = new Cache(this.repository)
    const listener = new Listener(BLOCKCHAIN_WS_URL, this.setup.oneShotScheduleContractAddress)
    const recoverer = new Recoverer(BLOCKCHAIN_HTTP_URL, this.setup.oneShotScheduleContractAddress)
    const executor = new ExecutorMock()
    const collector = new Collector(this.repository)
    const scheduler = new SchedulerMock()

    this.core = new Core(recoverer, listener, this.cache, collector, executor, scheduler)

    this.executorExecuteSpied = jest.spyOn(executor, 'execute')
    this.collectorCollectSinceSpied = jest.spyOn(collector, 'collectSince')
    this.schedulerStartSpied = jest.spyOn(scheduler, 'start')
  })

  test('Should sync transactions after a restart', async () => {
    const incData = getMethodSigIncData(this.setup.web3)

    for (let i = 0; i < 2; i++) {
      const timestamp1 = addMinutes(new Date(), 15 + i)
      await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp1)
    }

    await this.core.start()
    // TODO: if we stop the service then fails to reconnect
    // await service.stop()

    await sleep(2000)
    const firstCount = await this.repository.count()

    expect(firstCount).toBe(2)

    for (let i = 0; i < 2; i++) {
      const timestamp2 = addMinutes(new Date(), 30 + i)
      await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp2)
    }

    await this.core.start()

    await sleep(2000)
    const secondCount = await this.repository.count()

    expect(secondCount).toBe(4)

    await this.core.stop()
    expect(this.schedulerStartSpied).toBeCalledTimes(2)
    expect(this.collectorCollectSinceSpied).toBeCalledTimes(2)
    expect(this.executorExecuteSpied).toBeCalledTimes(0)
  })

  test('Should cache new scheduled transactions', async () => {
    await this.core.start()

    const incData = getMethodSigIncData(this.setup.web3)

    for (let i = 0; i < 2; i++) {
      const timestamp = addMinutes(new Date(), 15 + i)
      await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp)
    }

    await sleep(2000)
    const count = await this.repository.count()

    expect(count).toBe(2)

    await this.core.stop()

    expect(this.schedulerStartSpied).toBeCalledTimes(1)
    expect(this.collectorCollectSinceSpied).toBeCalledTimes(1)
    expect(this.executorExecuteSpied).toBeCalledTimes(0)
  })

  test('Should collect and execute cached tx`s', async () => {
    const DIFF_IN_MINUTES = 15

    const incData = getMethodSigIncData(this.setup.web3)
    const timestampFuture = addMinutes(new Date(), DIFF_IN_MINUTES)
    mockDate(timestampFuture)

    const transaction = await this.setup.scheduleTransaction(0, incData, toBN(0), timestampFuture)

    await this.core.start()

    const cachedTx = await this.repository.findOne({
      where: {
        id: transaction.id
      }
    })

    await this.core.stop()
    expect(this.schedulerStartSpied).toBeCalledTimes(1)
    expect(this.collectorCollectSinceSpied).toBeCalledTimes(1)
    expect(this.executorExecuteSpied).toBeCalledTimes(1)
    expect(this.executorExecuteSpied).toBeCalledWith(transaction)
    expect(cachedTx).toBeDefined()
    expect(cachedTx?.status).toBe(EMetatransactionStatus.ExecutionSuccessful)

    const dateMocked = Date.now as any
    dateMocked.mockRestore()
  })
})
