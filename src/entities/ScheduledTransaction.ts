import { Entity, Column, Index, PrimaryColumn } from 'typeorm'

@Entity()
export class ScheduledTransaction {
  constructor (
    id: string,
    timestamp: string,
    blockNumber: number,
    state: string
  ) {
    this.id = id
    this.timestamp = timestamp
    this.blockNumber = blockNumber
    this.state = state
  }

  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  timestamp!: string;

  @Column('integer', { nullable: false })
  @Index({ unique: false })
  blockNumber!: number;

  @Column('text')
  state!: string;

  @Column('text', { nullable: true })
  reason!: string | undefined;
}
