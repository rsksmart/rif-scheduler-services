import { ICache } from '../cache/Cache'
import { EMetatransactionStatus } from '../IMetatransaction'
import loggerFactory from '../loggerFactory'
import { ITransactionExecutor } from '../provider/TransactionExecutor'

export interface ITransactionsCollector {
    collectAndExecute(): Promise<void>
}

class TransactionsCollector implements ITransactionsCollector {
  private cache: ICache;
  private executor: ITransactionExecutor

  constructor (cache: ICache, executor: ITransactionExecutor) {
    this.cache = cache
    this.executor = executor
  }

  async collectAndExecute (): Promise<void> {
    const toTimestamp = new Date()
    const collectedTx = await this.cache.getScheduledTransactionsUntil(toTimestamp)

    for (const transaction of collectedTx) {
      try {
        await this.executor.execute(transaction)
        await this.cache.changeStatus(transaction.index, EMetatransactionStatus.executed)
      } catch (error) {
        loggerFactory().error(error)
        await this.cache.changeStatus(transaction.index, EMetatransactionStatus.failed, error.message)
      }
    }
  }
}

export default TransactionsCollector
