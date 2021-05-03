import Cache from '../cache/Cache'
import loggerFactory from '../loggerFactory'
import { Recoverer, SchedulingsListener } from '../model'

class Core {
  private cache: Cache;
  private recoverer: Recoverer
  private listener: SchedulingsListener

  constructor (recoverer: Recoverer, listener: SchedulingsListener, cache: Cache) {
    this.cache = cache
    this.recoverer = recoverer
    this.listener = listener
  }

  async start () {
    loggerFactory().debug('Starting...')

    loggerFactory().debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const pastEvents = await this.recoverer.recoverScheduledTransactions(
      lastBlockNumber
    )

    for (const event of pastEvents) {
      await this.cache.save(event)
    }

    loggerFactory().debug('Start listening new events')

    await this.listener.listenNewScheduledTransactions(async (event) => {
      await this.cache.save(event)
    })
  }

  async stop () {
    await this.listener.disconnect()
    // TODO: stop schedule trigger

    loggerFactory().debug('Stopped')
  }
}

export default Core
