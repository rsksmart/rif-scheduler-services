import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity()
export class ScheduledTransaction {
  constructor (
    transactionIndex: number,
    timestamp: string,
    gas: number,
    blockNumber: number
  ) {
    this.transactionIndex = transactionIndex
    this.timestamp = timestamp
    this.gas = gas
    this.blockNumber = blockNumber
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  @Index({ unique: true })
  transactionIndex!: number;

  @Column('text')
  timestamp!: string;

  @Column('double')
  gas!: number;

  @Column('integer')
  @Index({ unique: false })
  blockNumber!: number;
}

export default [ScheduledTransaction]
