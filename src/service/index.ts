import { ICache } from '../cache'
import loggerFactory from '../loggerFactory'
import { IProvider } from '../provider'

class Core {
  private provider: IProvider;
  private cache: ICache;

  constructor (provider: IProvider, cache: ICache) {
    this.provider = provider
    this.cache = cache
  }

  async start () {
    loggerFactory().debug('Starting...')

    loggerFactory().debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlock()

    const pastEvents = await this.provider.getPastScheduledTransactions(
      lastBlockNumber
    )

    for (const event of pastEvents) {
      await this.cache.save({
        blockNumber: event.blockNumber,
        timestamp: event.timestamp,
        transactionIndex: event.index,
        gas: event.gas
      })
    }

    loggerFactory().debug('Start listening new events')

    await this.provider.listenNewScheduledTransactions(async (event) => {
      await this.cache.save({
        blockNumber: event.blockNumber,
        timestamp: event.timestamp,
        transactionIndex: event.index,
        gas: event.gas
      })
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
