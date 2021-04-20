import { ICache } from '../cache'
import { IProvider } from '../provider'

class Core {
  private provider: IProvider;
  private cache: ICache;

  constructor (provider: IProvider, cache: ICache) {
    this.provider = provider
    this.cache = cache
  }

  async start () {
    // Phase 1: add missed/older events to cache
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

    // Phase 2: start listening and adds to cache new events
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
    // TODO: stop provider event listener
    // TODO: stop schedule trigger
  }
}

export default Core
