import { Repository } from 'typeorm'
import IMetatransaction, { EMetatransactionStatus } from './common/IMetatransaction'
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
        transaction.requestor,
        transaction.plan,
        transaction.to,
        transaction.data,
        transaction.gas,
        transaction.timestamp.toISOString(),
        transaction.value,
        transaction.blockNumber,
        EMetatransactionStatus.Scheduled
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
    id: string,
    status: EMetatransactionStatus,
    reason?: string
  ): Promise<void> {
    const scheduledTransaction = await this.repository.findOne({
      where: {
        id
      }
    })

    if (scheduledTransaction) {
      scheduledTransaction.reason = reason
      scheduledTransaction.status = status

      await this.repository.save(scheduledTransaction)
    }
  }
}
