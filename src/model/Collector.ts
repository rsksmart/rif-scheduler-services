
import { LessThanOrEqual, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import IMetatransaction, { EMetatransactionState } from '../common/IMetatransaction'

export const transactionExecutionFailed = 'transactionExecutionFailed'
export class Collector {
  private repository: Repository<ScheduledTransaction>;

  constructor (repository: Repository<ScheduledTransaction>) {
    this.repository = repository
  }

  async collectSince (timestamp: Date): Promise<IMetatransaction[]> {
    const isoTimestamp = timestamp.toISOString()

    const transactionsToTimestamp = await this.repository.find({
      where: {
        timestamp: LessThanOrEqual(isoTimestamp),
        state: EMetatransactionState.Scheduled
      }
    })

    const result = transactionsToTimestamp.map((x): IMetatransaction => {
      return {
        id: x.id,
        blockNumber: x.blockNumber,
        timestamp: new Date(x.timestamp)
      }
    })

    return result
  }
}
