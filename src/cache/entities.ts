import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum ScheduledTransactionStatus {
  scheduled = "scheduled",
  finished = "finished",
  canceled = "canceled",
  failed = "failed",
}

@Entity()
export class ScheduledTransaction {
  constructor(
    transaction: string,
    executeAt: string,
    maxAmountOfGas: number,
    status: ScheduledTransactionStatus
  ) {
    this.transaction = transaction;
    this.executeAt = executeAt;
    this.maxAmountOfGas = maxAmountOfGas;
    this.status = status;
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column("text")
  transaction!: string;

  @Column("text")
  executeAt!: string;

  @Column("double")
  maxAmountOfGas!: number;

  @Column("text")
  status!: ScheduledTransactionStatus;
}

export default [ScheduledTransaction];
