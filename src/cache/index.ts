import { LessThanOrEqual, Repository } from "typeorm";
import { ScheduledTransaction, ScheduledTransactionStatus } from "./entities";

export interface ITransactionToSchedule {
  transactionIndex: number;
  executeAt: Date;
  gas: number;
  blockNumber: number;
}

export interface ICache {
  getExecutionBatch(): Promise<ScheduledTransaction[]>;
  changeStatus(
    transactionId: number,
    status: ScheduledTransactionStatus
  ): Promise<void>;
  add(transaction: ITransactionToSchedule): Promise<number | undefined>;
  getLastSyncedBlock(): Promise<number | undefined>;
}

class Cache implements ICache {
  private repository: Repository<ScheduledTransaction>;

  constructor(repository: Repository<ScheduledTransaction>) {
    this.repository = repository;
  }

  async getExecutionBatch() {
    const currentISODate = new Date().toISOString();

    const elegibleTransactions = await this.repository.find({
      where: {
        executeAt: LessThanOrEqual(currentISODate),
        status: ScheduledTransactionStatus.scheduled,
      },
    });

    return elegibleTransactions;
  }

  async changeStatus(
    transactionId: number,
    status: ScheduledTransactionStatus
  ) {
    const scheduledTransaction = await this.repository.findOne(transactionId);
    if (scheduledTransaction) {
      scheduledTransaction.status = status;
      await this.repository.save(scheduledTransaction);
    }
  }

  async add(transaction: ITransactionToSchedule) {
    let scheduledTransaction: ScheduledTransaction | undefined = undefined;

    try {
      scheduledTransaction = await this.repository.save(
        new ScheduledTransaction(
          transaction.transactionIndex,
          transaction.executeAt.toISOString(),
          transaction.gas,
          ScheduledTransactionStatus.scheduled,
          transaction.blockNumber
        )
      );
    } catch (error) {
      if (error?.code !== "SQLITE_CONSTRAINT") throw error;
    }

    return scheduledTransaction?.id;
  }

  async getLastBlockNumber() {
    const result = await this.repository
      .createQueryBuilder()
      .orderBy("blockNumber", "DESC")
      .getOne();

    return result?.blockNumber;
  }
}

export default Cache;
