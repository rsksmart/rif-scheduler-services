import { ICache } from "../cache";
import { IProvider } from "../provider";

class Service {
  private provider: IProvider;
  private cache: ICache;

  constructor(provider: IProvider, cache: ICache) {
    this.provider = provider;
    this.cache = cache;
  }

  async start() {
    // Phase 1: add missed/older events to cache
    const lastBlockNumber = await this.cache.getLastBlockNumber();

    const pastEvents = await this.provider.getPastMetatransactionAddedEvents(
      lastBlockNumber
    );

    for (const event of pastEvents) {
      await this.cache.add({
        blockNumber: event.blockNumber,
        executeAt: event.timestamp,
        transactionIndex: event.index,
        gas: event.gas,
      });
    }

    // TODO: Phase 2: start listening and adds to cache new events

    // TODO: Phase 3: trigger scheduled transactions every n minutes
  }

  async stop() {
    // TODO: stop SM listener
    // TODO: stop schedule trigger
  }
}

export default Service;
