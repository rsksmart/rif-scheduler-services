import { createDbConnection } from '../storage/createDbConnection'
import { deleteDatabase, resetDatabase, sleep } from './utils'
import { deployAllContracts, ISetup, setupContracts } from './setupContracts'
import { BLOCKCHAIN_HTTP_URL } from './constants'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction, EMetatransactionState } from '../entities'
import { Cache, Store } from '../storage'
import { addMinutes } from 'date-fns'
import Web3 from 'web3'
import { Recoverer, Collector } from '../model'
import Core from '../Core'
import { ExecutorMock, SchedulerMock } from './mocks'
import { BlockchainDate } from '../time'
import { time } from '@openzeppelin/test-helpers'
import tracer from 'tracer'

const logger = tracer.colorConsole()

jest.setTimeout(32000)

export function runCoreWith (name: string, Listener: any, listenerRpcUrl: string) {
  const DB_NAME = `test_db_core_${name}_${Date.now()}`
  const EXTRA_MINUTES = 15
  const WAIT_MILLISECONDS = 1000

  describe(`Core with ${name}`, function (this: {
    dbConnection: Connection;
    cache: Cache;
    repository: Repository<ScheduledTransaction>;
    web3: Web3;
    setup: ISetup;
    core: Core;
    blockchainDate: BlockchainDate;
    executorExecuteSpied: any;
    collectorCollectSinceSpied: any;
    schedulerStartSpied: any
  }) {
    afterEach(async () => {
      if (this.dbConnection && this.dbConnection.isConnected) {
        await resetDatabase(this.dbConnection)
        await deleteDatabase(this.dbConnection, DB_NAME)
      }
      jest.clearAllMocks()
      new Store().clearAll()
    })
    beforeEach(async () => {
      // disable console.log
      jest.spyOn(console, 'log').mockImplementation(() => {})

      this.dbConnection = await createDbConnection(DB_NAME)

      this.repository = this.dbConnection.getRepository(ScheduledTransaction)

      this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)

      const contracts = await deployAllContracts(this.web3)
      this.setup = await setupContracts(
        this.web3,
        contracts.tokenAddress,
        contracts.counterAddress,
        contracts.rifSchedulerAddress
      )

      this.cache = new Cache(this.repository)
      const listener = new Listener(listenerRpcUrl, this.setup.rifScheduler.options.address)
      if (listener.pollingInterval) {
        listener.pollingInterval = WAIT_MILLISECONDS
      }

      const recoverer = new Recoverer(BLOCKCHAIN_HTTP_URL, this.setup.rifScheduler.options.address)
      const executor = new ExecutorMock()
      const collector = new Collector(this.repository)
      const scheduler = new SchedulerMock()
      this.blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

      this.core = new Core(
        recoverer,
        listener,
        this.cache,
        collector,
        executor,
        scheduler,
        this.blockchainDate,
        new Store(),
        logger,
        { startFromBlockNumber: 0, blocksChunkSize: 10 }
      )

      this.executorExecuteSpied = jest.spyOn(executor, 'execute')
      this.collectorCollectSinceSpied = jest.spyOn(collector, 'collectSince')
      this.schedulerStartSpied = jest.spyOn(scheduler, 'start')
    })

    // TODO: if we stop the service then fails to reconnect
    // for now it's not possible to stop it because it hangs out
    // this happens with WebSocket
    test('Should sync transactions after a restart', async () => {
      const currentDate = await this.blockchainDate.now()
      for (let i = 0; i < 4; i++) {
        const timestamp1 = addMinutes(currentDate, EXTRA_MINUTES + i)
        await this.setup.scheduleTransaction({ plan: 0, timestamp: timestamp1 })
      }

      await this.core.start()

      await sleep(WAIT_MILLISECONDS * 2)
      const cachedCount = await this.repository.count()

      expect(cachedCount).toBe(4)

      await this.core.stop()
      expect(this.schedulerStartSpied).toBeCalledTimes(1)
      expect(this.collectorCollectSinceSpied).toBeCalledTimes(1)
      expect(this.executorExecuteSpied).toBeCalledTimes(0)
    })

    test('Should cache new scheduled transactions', async () => {
      await this.core.start()

      const currentDate = await this.blockchainDate.now()
      for (let i = 0; i < 2; i++) {
        const timestamp = addMinutes(currentDate, EXTRA_MINUTES + i)
        await this.setup.scheduleTransaction({ plan: 0, timestamp })
      }

      await sleep(WAIT_MILLISECONDS * 2)
      const count = await this.repository.count()

      expect(count).toBe(2)

      await this.core.stop()

      expect(this.schedulerStartSpied).toBeCalledTimes(1)
      expect(this.collectorCollectSinceSpied).toBeCalledTimes(1)
      expect(this.executorExecuteSpied).toBeCalledTimes(0)
    })

    test('Should collect and execute cached tx`s', async () => {
      const DIFF_IN_MINUTES = EXTRA_MINUTES

      const currentDate = await this.blockchainDate.now()
      const timestampFuture = addMinutes(currentDate, DIFF_IN_MINUTES)

      const transaction = await this.setup.scheduleTransaction({ plan: 0, timestamp: timestampFuture })

      await time.increase(DIFF_IN_MINUTES * 60)
      await time.advanceBlock()

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
      expect(cachedTx?.state).toBe(EMetatransactionState.ExecutionSuccessful)
    })
  })
}
