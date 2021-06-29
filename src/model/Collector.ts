
import { LessThanOrEqual, Repository } from 'typeorm'
import { ScheduledExecution, IExecution, EExecutionState } from '../entities'

export const transactionExecutionFailed = 'transactionExecutionFailed'
export class Collector {
  private repository: Repository<ScheduledExecution>;

  constructor (repository: Repository<ScheduledExecution>) {
    this.repository = repository
  }

  async collectSince (timestamp: Date): Promise<IExecution[]> {
    const isoTimestamp = timestamp.toISOString()

    const transactionsToTimestamp = await this.repository.find({
      where: {
        timestamp: LessThanOrEqual(isoTimestamp),
        state: EExecutionState.Scheduled
      }
    })

    const result = transactionsToTimestamp.map((x): IExecution => {
      return {
        id: x.id,
        blockNumber: x.blockNumber,
        timestamp: new Date(x.timestamp)
      }
    })

    return result
  }
}
