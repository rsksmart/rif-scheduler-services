import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity()
export class ScheduledTransaction {
  constructor (
    index: number,
    from: string,
    plan: number,
    to: string,
    data: string,
    gas: number,
    timestamp: string,
    value: string,
    blockNumber: number,
    status: string
  ) {
    this.index = index
    this.from = from
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
  id!: number;

  @Column('integer')
  @Index({ unique: true })
  index!: number;

  @Column('text')
  from!: string;

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
}

export default [ScheduledTransaction]
