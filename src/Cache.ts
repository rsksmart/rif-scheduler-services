import { Repository } from 'typeorm'
import IMetatransaction, { EMetatransactionState } from './common/IMetatransaction'
import { ScheduledTransaction } from './common/entities'

export class Cache {
  private repository: Repository<ScheduledTransaction>;

  constructor (repository: Repository<ScheduledTransaction>) {
    this.repository = repository
  }

  async save (transaction: IMetatransaction): Promise<string> {
    const cacheTransaction = await this.repository.findOne({
      where: { id: transaction.id }
    })

    if (cacheTransaction) return cacheTransaction.id

    const scheduledTransaction = await this.repository.save(
      new ScheduledTransaction(
        transaction.id,
        transaction.timestamp.toISOString(),
        transaction.blockNumber,
        EMetatransactionState.Scheduled
      )
    )

    return scheduledTransaction.id
  }

  async getLastSyncedBlockNumber (): Promise<number | undefined> {
    const result = await this.repository
      .findOne({
        order: { blockNumber: 'DESC' }
      })

    return result?.blockNumber
  }

  async changeState (
    id: string,
    state: EMetatransactionState,
    reason?: string
  ): Promise<void> {
    const scheduledTransaction = await this.repository.findOne({
      where: {
        id
      }
    })

    if (scheduledTransaction) {
      scheduledTransaction.reason = reason
      scheduledTransaction.state = state

      await this.repository.save(scheduledTransaction)
    }
  }
}
