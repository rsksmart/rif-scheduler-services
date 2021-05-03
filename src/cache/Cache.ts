import { LessThanOrEqual, Repository } from 'typeorm'
import IMetatransaction, { EMetatransactionStatus } from '../IMetatransaction'
import { ScheduledTransaction } from './entities'

export interface ICache {
  save(transaction: IMetatransaction): Promise<number>;
  getLastSyncedBlock(): Promise<number | undefined>;
  getScheduledTransactionsTo (timestamp: Date): Promise<IMetatransaction[]>;
  changeStatus (index: number, status: EMetatransactionStatus, reason?: string): Promise<void>;
}

class Cache implements ICache {
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

  async getLastSyncedBlock (): Promise<number | undefined> {
    const result = await this.repository
      .createQueryBuilder()
      .orderBy('blockNumber', 'DESC')
      .getOne()

    return result?.blockNumber
  }

  async getScheduledTransactionsTo (timestamp: Date): Promise<IMetatransaction[]> {
    const isoTimestamp = timestamp.toISOString()

    const transactionsToTimestamp = await this.repository.find({
      where: {
        timestamp: LessThanOrEqual(isoTimestamp),
        status: EMetatransactionStatus.scheduled
      }
    })

    const result = transactionsToTimestamp.map((x): IMetatransaction => {
      return {
        index: x.index,
        from: x.from,
        plan: x.plan,
        to: x.to,
        data: x.data,
        gas: x.gas,
        value: x.value,
        blockNumber: x.blockNumber,
        timestamp: new Date(x.timestamp)
      }
    })

    return result
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

export default Cache
