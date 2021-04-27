import { Repository } from 'typeorm'
import IMetatransaction from '../IMetatransaction'
import { ScheduledTransaction } from './entities'

export interface ICache {
  save(transaction: IMetatransaction): Promise<number>;
  getLastSyncedBlock(): Promise<number | undefined>;
}

class Cache implements ICache {
  private repository: Repository<ScheduledTransaction>;

  constructor (repository: Repository<ScheduledTransaction>) {
    this.repository = repository
  }

  async save (transaction: IMetatransaction) {
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
        transaction.blockNumber
      )
    )

    return scheduledTransaction.id
  }

  async getLastSyncedBlock () {
    const result = await this.repository
      .createQueryBuilder()
      .orderBy('blockNumber', 'DESC')
      .getOne()

    return result?.blockNumber
  }
}

export default Cache
