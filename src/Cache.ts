import { Repository } from 'typeorm'
import IMetatransaction, { EMetatransactionStatus } from './common/IMetatransaction'
import { ScheduledTransaction } from './common/entities'

export class Cache {
  private repository: Repository<ScheduledTransaction>;

  constructor (repository: Repository<ScheduledTransaction>) {
    this.repository = repository
  }

  async save (transaction: IMetatransaction): Promise<number> {
    const cacheTransaction = await this.repository.findOne({
      where: { index: transaction.index }
    })

    if (cacheTransaction) return cacheTransaction.id

    const scheduledTransaction = await this.repository.save(
      new ScheduledTransaction(
        transaction.index,
        transaction.from,
        transaction.plan,
        transaction.to,
        transaction.data,
        transaction.gas,
        transaction.timestamp.toISOString(),
        transaction.value,
        transaction.blockNumber,
        EMetatransactionStatus.scheduled
      )
    )

    return scheduledTransaction.id
  }

  async getLastSyncedBlockNumber (): Promise<number | undefined> {
    const result = await this.repository
      .createQueryBuilder()
      .orderBy('blockNumber', 'DESC')
      .getOne()

    return result?.blockNumber
  }

  async changeStatus (
    index: number,
    status: EMetatransactionStatus,
    reason?: string
  ): Promise<void> {
    const scheduledTransaction = await this.repository.findOne({
      where: {
        index
      }
    })

    if (scheduledTransaction) {
      scheduledTransaction.reason = reason
      scheduledTransaction.status = status

      await this.repository.save(scheduledTransaction)
    }
  }
}