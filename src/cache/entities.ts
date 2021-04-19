import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

export enum ScheduledTransactionStatus {
  scheduled = "scheduled",
  finished = "finished",
  canceled = "canceled",
  failed = "failed",
}

@Entity()
export class ScheduledTransaction {
  constructor(
    transactionIndex: number,
    executeAt: string,
    gas: number,
    status: ScheduledTransactionStatus,
    blockNumber: number
  ) {
    this.transactionIndex = transactionIndex;
    this.executeAt = executeAt;
    this.gas = gas;
    this.status = status;
    this.blockNumber = blockNumber;
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column("integer")
  @Index({ unique: true })
  transactionIndex!: number;

  @Column("text")
  timestamp!: string;

  @Column("double")
  gas!: number;

  @Column("text")
  status!: ScheduledTransactionStatus;

  @Column("integer")
  @Index({ unique: false })
  blockNumber!: number;
}

export default [ScheduledTransaction];
