import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity()
export class ScheduledTransaction {
  constructor (
    id: string,
    requestor: string,
    plan: number,
    to: string,
    data: string,
    gas: number,
    timestamp: string,
    value: string,
    blockNumber: number,
    status: string
  ) {
    this.id = id
    this.requestor = requestor
    this.plan = plan
    this.to = to
    this.data = data
    this.gas = gas
    this.timestamp = timestamp
    this.value = value
    this.blockNumber = blockNumber
    this.status = status
  }

  @PrimaryGeneratedColumn()
  key!: number;

  @Column('integer')
  @Index({ unique: true })
  id!: string;

  @Column('text')
  requestor!: string;

  @Column('integer')
  plan!: number;

  @Column('text')
  to!: string;

  @Column('text')
  data!: string;

  @Column('double')
  gas!: number;

  @Column('text')
  timestamp!: string;

  @Column('text')
  value!: string;

  @Column('integer')
  @Index({ unique: false })
  blockNumber!: number;

  @Column('text')
  status!: string;

  @Column('text', { nullable: true })
  reason!: string | undefined;
}

export default [ScheduledTransaction]
