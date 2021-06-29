import { Recoverer } from './Recoverer'

export class BatchRecoverer {
  public currentChunkBlockNumber = 0

  constructor(private recoverer: Recoverer, private chunkSize: number) {}

  async *iterator (fromBlock: number) {
    let lastSyncedBlockNumber = fromBlock
    let currentBlockNumber = await this.recoverer.getCurrentBlockNumber()

    while(currentBlockNumber > lastSyncedBlockNumber) {
      this.currentChunkBlockNumber = lastSyncedBlockNumber + this.chunkSize

      if (this.currentChunkBlockNumber > currentBlockNumber) {
        this.currentChunkBlockNumber = currentBlockNumber
      }

      const pastEvents = await this.recoverer.recoverScheduledTransactions(
        lastSyncedBlockNumber,
        this.currentChunkBlockNumber
      )

      lastSyncedBlockNumber = this.currentChunkBlockNumber

      yield pastEvents

      currentBlockNumber = await this.recoverer.getCurrentBlockNumber()
    }
  }
}
