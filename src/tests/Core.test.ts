import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase, sleep } from './utils'
import { deployAllContracts, ISetup, setupContracts } from './setupContracts'
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
import { EMetatransactionState } from '../common/IMetatransaction'
import { ExecutorMock, SchedulerMock } from './mocks'
import { BlockchainDate } from '../common/BlockchainDate'
import { time } from '@openzeppelin/test-helpers'

jest.setTimeout(27000)

const DB_NAME = 'test_db_core'

describe('Core', () => {
  let dbConnection: Connection | undefined
  let repository: Repository<ScheduledTransaction> | undefined
  let setup: ISetup | undefined
  let core: Core | undefined
  let blockchainDate: BlockchainDate | undefined
  let executorExecuteSpied: any | undefined
  let collectorCollectSinceSpied: any | undefined
  let schedulerStartSpied: any | undefined

  beforeEach(async () => {
    dbConnection = await createDbConnection(DB_NAME)

    repository = dbConnection.getRepository(ScheduledTransaction)

    const web3 = new Web3(BLOCKCHAIN_HTTP_URL)

    const contracts = await deployAllContracts(web3!)
    setup = await setupContracts(
      web3!,
      contracts.tokenAddress,
      contracts.counterAddress,
      contracts.oneShotScheduleAddress
    )

    const cache = new Cache(repository!)
    const listener = new Listener(BLOCKCHAIN_WS_URL, setup!.oneShotSchedule.options.address)
    const recoverer = new Recoverer(BLOCKCHAIN_HTTP_URL, setup!.oneShotSchedule.options.address)
    const executor = new ExecutorMock()
    const collector = new Collector(repository!)
    const scheduler = new SchedulerMock()
    blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

    core = new Core(recoverer, listener, cache!, collector, executor, scheduler, blockchainDate!)

    executorExecuteSpied = jest.spyOn(executor, 'execute')
    collectorCollectSinceSpied = jest.spyOn(collector, 'collectSince')
    schedulerStartSpied = jest.spyOn(scheduler, 'start')
  })

  afterEach(async () => {
    if (dbConnection && dbConnection.isConnected) {
      await resetDatabase(dbConnection)
      await deleteDatabase(dbConnection, DB_NAME)
    }
    jest.clearAllMocks()

    dbConnection = undefined
    repository = undefined
    setup = undefined
    core = undefined
    blockchainDate = undefined
    executorExecuteSpied = undefined
    collectorCollectSinceSpied = undefined
    schedulerStartSpied = undefined
  })

  // TODO: if we stop the service then fails to reconnect
  // for now it's not possible to stop it because it hangs out
  test('Should sync transactions after a restart', async () => {
    const currentDate = await blockchainDate!.now()
    for (let i = 0; i < 4; i++) {
      const timestamp1 = addMinutes(currentDate, 15 + i)
      await setup!.scheduleTransaction({ plan: 0, timestamp: timestamp1 })
    }

    await core!.start()

    await sleep(2000)
    const cachedCount = await repository!.count()

    expect(cachedCount).toBe(4)

    await core!.stop()
    expect(schedulerStartSpied).toBeCalledTimes(1)
    expect(collectorCollectSinceSpied).toBeCalledTimes(1)
    expect(executorExecuteSpied).toBeCalledTimes(0)
  })

  test('Should cache new scheduled transactions', async () => {
    await core!.start()

    const currentDate = await blockchainDate!.now()
    for (let i = 0; i < 2; i++) {
      const timestamp = addMinutes(currentDate, 15 + i)
      await setup!.scheduleTransaction({ plan: 0, timestamp })
    }

    await sleep(2000)
    const count = await repository!.count()

    expect(count).toBe(2)

    await core!.stop()

    expect(schedulerStartSpied).toBeCalledTimes(1)
    expect(collectorCollectSinceSpied).toBeCalledTimes(1)
    expect(executorExecuteSpied).toBeCalledTimes(0)
  })

  test('Should collect and execute cached tx`s', async () => {
    const DIFF_IN_MINUTES = 15

    const currentDate = await blockchainDate!.now()
    const timestampFuture = addMinutes(currentDate, DIFF_IN_MINUTES)

    const transaction = await setup!.scheduleTransaction({ plan: 0, timestamp: timestampFuture })

    await time.increase(DIFF_IN_MINUTES * 60)
    await time.advanceBlock()

    await core!.start()

    const cachedTx = await repository!.findOne({
      where: {
        id: transaction.id
      }
    })

    await core!.stop()
    expect(schedulerStartSpied).toBeCalledTimes(1)
    expect(collectorCollectSinceSpied).toBeCalledTimes(1)
    expect(executorExecuteSpied).toBeCalledTimes(1)
    expect(executorExecuteSpied).toBeCalledWith(transaction)
    expect(cachedTx).toBeDefined()
    expect(cachedTx?.state).toBe(EMetatransactionState.ExecutionSuccessful)
  })
})
