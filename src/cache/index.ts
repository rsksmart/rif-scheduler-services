import { LessThanOrEqual, Repository } from "typeorm";
import { ScheduledTransaction, ScheduledTransactionStatus } from "./entities";

export interface ITransactionToSchedule {
  transaction: string;
  executeAt: Date;
  maxAmountOfGas: number;
}

export interface ICache {
  getExecutionBatch(): Promise<ScheduledTransaction[]>;
  changeStatus(
    transactionId: number,
    status: ScheduledTransactionStatus
  ): Promise<void>;
  add(transaction: ITransactionToSchedule): Promise<number>;
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
    const scheduledTransaction = await this.repository.save(
      new ScheduledTransaction(
        transaction.transaction,
        transaction.executeAt.toISOString(),
        transaction.maxAmountOfGas,
        ScheduledTransactionStatus.scheduled
      )
    );
    return scheduledTransaction.id;
  }
}

export default Cache;
