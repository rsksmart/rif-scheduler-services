import { Repository } from "typeorm";
import { ScheduledTransaction } from "./entities";

export interface ITransactionToSchedule {
  transactionIndex: number;
  timestamp: Date;
  gas: number;
  blockNumber: number;
}

export interface ICache {
  save(transaction: ITransactionToSchedule): Promise<number>;
  getLastSyncedBlock(): Promise<number | undefined>;
}

class Cache implements ICache {
  private repository: Repository<ScheduledTransaction>;

  constructor(repository: Repository<ScheduledTransaction>) {
    this.repository = repository;
  }

  async save(transaction: ITransactionToSchedule) {
    const cacheTransaction = await this.repository.findOne({
      where: { transactionIndex: transaction.transactionIndex },
    });

    if (cacheTransaction) return cacheTransaction.id;

    const scheduledTransaction = await this.repository.save(
      new ScheduledTransaction(
        transaction.transactionIndex,
        transaction.timestamp.toISOString(),
        transaction.gas,
        transaction.blockNumber
      )
    );

    return scheduledTransaction.id;
  }

  async getLastSyncedBlock() {
    const result = await this.repository
      .createQueryBuilder()
      .orderBy("blockNumber", "DESC")
      .getOne();

    return result?.blockNumber;
  }
}

export default Cache;
