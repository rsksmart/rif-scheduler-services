import { ICache } from '../cache/Cache'
import loggerFactory from '../loggerFactory'
import { IProvider } from '../provider/OneShotSchedule'

class Core { // FIXME: name proposal: TransactionsScheduleOrchestrator
  private provider: IProvider;
  private cache: ICache;

  constructor (provider: IProvider, cache: ICache) {
    this.provider = provider
    this.cache = cache
  }

  async start () {
    loggerFactory().debug('Starting...')

    loggerFactory().debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const pastEvents = await this.provider.getPastScheduledTransactions(
      lastBlockNumber
    )

    for (const event of pastEvents) {
      await this.cache.save(event)
    }

    loggerFactory().debug('Start listening new events')

    await this.provider.listenNewScheduledTransactions(async (event) => {
      await this.cache.save(event)
    })

    // TODO: Phase 3: trigger scheduled transactions every n minutes
  }

  async stop () {
    await this.provider.disconnect()
    // TODO: stop schedule trigger

    loggerFactory().debug('Stopped')
  }
}

export default Core
