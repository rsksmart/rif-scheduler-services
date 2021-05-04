import Cache from '../cache/Cache'
import loggerFactory from '../loggerFactory'
import { Recoverer } from '../model/Recoverer'
import { Listener, newScheduledTransactionsError, webSocketProviderError } from '../model/Listener'
import { Collector, transactionExecutionFailed } from '../model/Collector'
import { Tracer } from 'tracer'
import { ITimer } from './Timer'

class Core {
  private cache: Cache;
  private recoverer: Recoverer
  private listener: Listener
  private collector: Collector
  private timer: ITimer
  private logger: Tracer.Logger

  constructor (recoverer: Recoverer, listener: Listener, cache: Cache, collector: Collector, timer: ITimer) {
    this.cache = cache
    this.recoverer = recoverer
    this.listener = listener

    this.collector = collector
    this.timer = timer

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

    this.logger.debug('Start listening new events')

    this.listener.on(newScheduledTransactionsError, this.logger.error)
    this.listener.on(webSocketProviderError, this.logger.error)

    await this.listener.listenNewScheduledTransactions(async (event) => {
      await this.cache.save(event)
    })

    this.collector.on(transactionExecutionFailed, this.logger.error)

    await this.timer.start(this.collector)
  }

  async stop () {
    await this.listener.disconnect()
    await this.collector.disconnect()
    await this.timer.stop()

    this.logger.debug('Stopped')
  }
}

export default Core
