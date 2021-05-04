import Cache from '../cache/Cache'
import { EMetatransactionStatus } from '../IMetatransaction'
import { Executor } from './Executor'
import { EventEmitter } from 'events'

export const transactionExecutionFailed = 'transactionExecutionFailed'
export class Collector extends EventEmitter {
  private cache: Cache;
  private executor: Executor

  constructor (cache: Cache, executor: Executor) {
    super()

    this.cache = cache
    this.executor = executor
  }

  async collectAndExecute (): Promise<void> {
    const timestamp = new Date()
    const collectedTx = await this.cache.getScheduledTransactionsUntil(timestamp)

    for (const transaction of collectedTx) {
      try {
        await this.executor.execute(transaction)
        await this.cache.changeStatus(transaction.index, EMetatransactionStatus.executed)
      } catch (error) {
        this.emit(transactionExecutionFailed, error)
        await this.cache.changeStatus(transaction.index, EMetatransactionStatus.failed, error.message)
      }
    }
  }

  async disconnect () {
    await this.executor.stopEngine()
  }
}
