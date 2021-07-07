import { Tracer } from 'tracer'
import { BatchRecoverer, Collector, IScheduler, IExecutor, IListener, EListenerEvents } from './model'
import { Cache, Store } from './storage'
import { BlockchainDate } from './time'

class Core {
  // eslint-disable-next-line no-useless-constructor
  constructor (
    private batchRecoverer: BatchRecoverer,
    private listener: IListener,
    private cache: Cache,
    private collector: Collector,
    private executor: IExecutor,
    private scheduler: IScheduler,
    private blockchainDate: BlockchainDate,
    private keyValueStore: Store,
    private logger: Tracer.Logger,
    private config: { startFromBlockNumber: number }
  ) { }

  async start () {
    this.logger.debug('Starting...')

    this.executor.account().then(account => this.logger.debug(`Account: ${account}`))

    this.logger.debug('Sync missed/older events')

    const lastBlockNumberFromCache = await this.cache.getLastSyncedBlockNumber() ?? 0
    const lastSyncedBlockNumberStored = this.keyValueStore.getLastSyncedBlockNumber() ?? 0

    const lastSyncedBlockNumber = Math.max(
      lastBlockNumberFromCache,
      lastSyncedBlockNumberStored,
      this.config.startFromBlockNumber
    )

    this.logger.debug(`Last synced block number: ${lastSyncedBlockNumber}`)

    const iterator = await this.batchRecoverer.iterator(lastSyncedBlockNumber)

    for await (const pastEvents of iterator) {
      for (const event of pastEvents) {
        this.logger.info('Recovering past event', event)
        await this.cache.save(event)
      }

      this.keyValueStore.setLastSyncedBlockNumber(this.batchRecoverer.currentChunkBlockNumber)
    }

    this.listener.on(EListenerEvents.ExecutionRequestedError, this.logger.error)
    this.listener.on(EListenerEvents.ProviderError, this.logger.error)
    this.listener.on(EListenerEvents.ExecutionRequested, async (result) => {
      this.logger.info('New execution requested', result)
      await this.cache.save(result)
    })

    this.logger.debug('Start listening new execution requests')
    await this.listener.listenNewExecutionRequests(this.batchRecoverer.currentChunkBlockNumber)

    this.logger.debug('Start scheduler')
    await this.scheduler.start(async () => {
      const currentDate = await this.blockchainDate.now()
      const collectedTx = await this.collector.collectSince(currentDate)

      for (const transaction of collectedTx) {
        this.logger.info('Executing: ', transaction)

        const result = await this.executor.execute(transaction)
        const reason = result.tx || result.error!.message

        await this.cache.changeState(transaction.id, result.state, reason)
        if (result.error) this.logger.error(result.error)
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
