import { Cache } from './Cache'
import loggerFactory from './common/loggerFactory'
import { Recoverer } from './Recoverer'
import { Listener, newScheduledTransactionsError, webSocketProviderError } from './Listener'
import { Collector } from './Collector'
import { Tracer } from 'tracer'
import { IScheduler } from './Scheduler'
import { IExecutor } from './Executor'
import { BlockchainDate } from './common/BlockchainDate'
import KeyValueStore from './common/keyValueStore'

class Core {
  private logger: Tracer.Logger

  constructor (
    private recoverer: Recoverer,
    private listener: Listener,
    private cache: Cache,
    private collector: Collector,
    private executor: IExecutor,
    private scheduler: IScheduler,
    private blockchainDate: BlockchainDate,
    private keyValueStore: KeyValueStore,
    private config: { startFromBlockNumber: number, blocksChunkSize: number }
  ) {
    this.logger = loggerFactory()
  }

  async start () {
    this.logger.debug('Starting...')

    this.executor.account().then(account => this.logger.debug(`Account: ${account}`))

    const lastSyncedBlockNumber = this.keyValueStore.getLastSyncedBlockNumber() || (await this.cache.getLastSyncedBlockNumber())
    this.logger.debug(`Last synced block number: ${lastSyncedBlockNumber}`)

    this.logger.debug('Sync missed/older events')
    const lastBlockNumberOrDefault = lastSyncedBlockNumber || this.config.startFromBlockNumber
    let currentBlockNumber = await this.recoverer.getCurrentBlockNumber()

    for (let index = lastBlockNumberOrDefault; index < currentBlockNumber; index += this.config.blocksChunkSize) {
      this.logger.debug(`Recovering: ${index} / ${currentBlockNumber}`)

      const pastEvents = await this.recoverer.recoverScheduledTransactions(index, index + this.config.blocksChunkSize)

      for (const event of pastEvents) {
        this.logger.info('Recovering past event', event)
        await this.cache.save(event)
      }

      this.keyValueStore.setLastSyncedBlockNumber(index)

      currentBlockNumber = await this.recoverer.getCurrentBlockNumber()
    }

    this.listener.on(newScheduledTransactionsError, this.logger.error)
    this.listener.on(webSocketProviderError, this.logger.error)

    this.logger.debug('Start listening new events')
    await this.listener.listenNewScheduledTransactions(async (event) => {
      this.logger.info('New scheduled execution', event)
      await this.cache.save(event)
    })

    this.logger.debug('Start scheduler')
    await this.scheduler.start(async () => {
      const currentDate = await this.blockchainDate.now()
      const collectedTx = await this.collector.collectSince(currentDate)

      for (const transaction of collectedTx) {
        this.logger.info('Executing: ', transaction)

        const error = await this.executor
          .execute(transaction)
          .catch(error => error)

        const resultState = await this.executor.getCurrentState(transaction.id)
        await this.cache.changeState(transaction.id, resultState, error?.message)

        if (error) {
          this.logger.error(error)
        }
      }
    })
  }

  async stop () {
    this.logger.debug('Stopped')

    await this.listener.disconnect()
    await this.executor.stopEngine()
    await this.scheduler.stop()
  }
}

export default Core
