import { Cache } from './Cache'
import loggerFactory from './common/loggerFactory'
import { Recoverer } from './Recoverer'
import { Listener, newScheduledTransactionsError, webSocketProviderError } from './Listener'
import { Collector, transactionExecutionFailed } from './Collector'
import { Tracer } from 'tracer'
import { IScheduler } from './Scheduler'

class Core {
  private cache: Cache;
  private recoverer: Recoverer
  private listener: Listener
  private collector: Collector
  private scheduler: IScheduler
  private logger: Tracer.Logger

  constructor (recoverer: Recoverer, listener: Listener, cache: Cache, collector: Collector, scheduler: IScheduler) {
    this.cache = cache
    this.recoverer = recoverer
    this.listener = listener

    this.collector = collector
    this.scheduler = scheduler

    this.logger = loggerFactory()
  }

  async start () {
    this.logger.debug('Starting...')

    this.logger.debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const pastEvents = await this.recoverer.recoverScheduledTransactions(
      lastBlockNumber
    )

    for (const event of pastEvents) {
      await this.cache.save(event)
    }

    this.listener.on(newScheduledTransactionsError, this.logger.error)
    this.listener.on(webSocketProviderError, this.logger.error)

    this.logger.debug('Start listening new events')
    await this.listener.listenNewScheduledTransactions(async (event) => {
      await this.cache.save(event)
    })

    this.collector.on(transactionExecutionFailed, this.logger.error)

    this.logger.debug('Start scheduler')
    await this.scheduler.start(this.collector)
  }

  async stop () {
    await this.listener.disconnect()
    await this.collector.disconnect()
    await this.scheduler.stop()

    this.logger.debug('Stopped')
  }
}

export default Core
