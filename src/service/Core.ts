import Cache from '../cache/Cache'
import loggerFactory from '../loggerFactory'
import { Recoverer } from '../model/Recoverer'
import { Listener, newScheduledTransactionsError, webSocketProviderError } from '../model/Listener'
import { Tracer } from 'tracer'

class Core {
  private cache: Cache;
  private recoverer: Recoverer
  private listener: Listener
  private logger: Tracer.Logger

  constructor (recoverer: Recoverer, listener: Listener, cache: Cache) {
    this.cache = cache
    this.recoverer = recoverer
    this.listener = listener

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

    await this.listener.listenNewScheduledTransactions(async (event) => {
      await this.cache.save(event)
    })

    this.listener.on(newScheduledTransactionsError, this.logger.error)
    this.listener.on(webSocketProviderError, this.logger.error)
  }

  async stop () {
    await this.listener.disconnect()
    // TODO: stop schedule trigger

    this.logger.debug('Stopped')
  }
}

export default Core
