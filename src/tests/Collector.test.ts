import { addMinutes } from 'date-fns'
import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase } from './utils'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { Collector } from '../model'
import IMetatransaction, { EMetatransactionState } from '../common/IMetatransaction'

jest.setTimeout(17000)

const DB_NAME = 'test_db_collector'

describe('Collector', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
}) {
  afterEach(async () => {
    if (this.dbConnection && this.dbConnection.isConnected) {
      await resetDatabase(this.dbConnection)
      await deleteDatabase(this.dbConnection, DB_NAME)
    }
  })
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)

    this.repository = this.dbConnection.getRepository(ScheduledTransaction)

    this.cache = new Cache(this.repository)
  })

  test('Should collect all transactions with state scheduled until the specified timestamp', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction: IMetatransaction = {
      id: 'none',
      timestamp: new Date(),
      blockNumber: 1
    }

    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid1',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid2',
      timestamp: addMinutes(timestamp, -20)
    })
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid3',
      timestamp: addMinutes(timestamp, -120)
    })
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid4',
      timestamp: addMinutes(timestamp, 1)
    })

    const count = await this.repository.count()

    expect(count).toBe(4)

    const collector = new Collector(this.repository)
    const result = await collector.collectSince(timestamp)

    expect(result.length).toBe(3)

    result.forEach((item) => {
      expect(item.timestamp <= timestamp).toBeTruthy()
    })
  })

  test('Should collect transactions only with state scheduled', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction: IMetatransaction = {
      id: 'none',
      timestamp: new Date(),
      blockNumber: 1
    }

    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid1',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid2',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeState('hashedid2', EMetatransactionState.ExecutionSuccessful)
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid3',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeState('hashedid3', EMetatransactionState.ExecutionFailed)

    const count = await this.repository.count()

    expect(count).toBe(3)

    const collector = new Collector(this.repository)
    const result = await collector.collectSince(timestamp)

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('hashedid1')
  })
})
