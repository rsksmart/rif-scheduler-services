import { Repository } from 'typeorm'
import { IExecution, EExecutionState, ScheduledExecution } from '../entities'

export class Cache {
  private repository: Repository<ScheduledExecution>;

  constructor (repository: Repository<ScheduledExecution>) {
    this.repository = repository
  }

  async save (transaction: IExecution): Promise<string> {
    const cacheTransaction = await this.repository.findOne({
      where: { id: transaction.id }
    })

    if (cacheTransaction) return cacheTransaction.id

    const scheduledTransaction = await this.repository.save(
      new ScheduledExecution(
        transaction.id,
        transaction.timestamp.toISOString(),
        transaction.blockNumber,
        EExecutionState.Scheduled
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
    state: EExecutionState,
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
