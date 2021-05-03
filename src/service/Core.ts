import { ICache } from '../cache/Cache'
import loggerFactory from '../loggerFactory'
import { SchedulingsRecoverer, SchedulingsListener } from '../model'

class Core { // FIXME: name proposal: TransactionsScheduleOrchestrator
  private cache: ICache;
  private recoverer: SchedulingsRecoverer
  private listener: SchedulingsListener

  constructor (recoverer: SchedulingsRecoverer, listener: SchedulingsListener, cache: ICache) {
    this.cache = cache
    this.recoverer =  recoverer
    this.listener = listener
  }

  async start () {
    loggerFactory().debug('Starting...')

    loggerFactory().debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const pastEvents = await this.recoverer.getPastScheduledTransactions(
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
