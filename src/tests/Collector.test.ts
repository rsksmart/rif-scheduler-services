import { addMinutes } from 'date-fns'
import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase } from './utils'
import { ISetup, setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { Collector } from '../Collector'
import { EMetatransactionStatus } from '../common/IMetatransaction'

jest.setTimeout(17000)

const DB_NAME = 'test_db_collector'

describe('Collector', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
  setup: ISetup
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

    this.setup = await setupContracts()

    await sendBalanceToProviderAccount(this.setup.web3)
  })

  test('Should collect all transactions with status scheduled until the specified timestamp', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction = {
      index: 0,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: new Date(),
      value: '',
      blockNumber: 1
    }

    await this.cache.save({
      ...mockMetatransaction,
      index: 1,
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.save({
      ...mockMetatransaction,
      index: 2,
      timestamp: addMinutes(timestamp, -20)
    })
    await this.cache.save({
      ...mockMetatransaction,
      index: 3,
      timestamp: addMinutes(timestamp, -120)
    })
    await this.cache.save({
      ...mockMetatransaction,
      index: 4,
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

  test('Should collect transactions only with status scheduled', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction = {
      index: 0,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: new Date(),
      value: '',
      blockNumber: 1
    }

    await this.cache.save({
      ...mockMetatransaction,
      index: 1,
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.save({
      ...mockMetatransaction,
      index: 2,
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeStatus(2, EMetatransactionStatus.executed)
    await this.cache.save({
      ...mockMetatransaction,
      index: 3,
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeStatus(3, EMetatransactionStatus.failed)

    const count = await this.repository.count()

    expect(count).toBe(3)

    const collector = new Collector(this.repository)
    const result = await collector.collectSince(timestamp)

    expect(result.length).toBe(1)
    expect(result[0].index).toBe(1)
  })
})