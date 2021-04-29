import { deleteDatabase, resetDatabase, createDbConnection } from './db'
import { Connection } from 'typeorm'
import { ScheduledTransaction } from './entities'
import Cache from './index'
import { addMinutes } from 'date-fns'

jest.setTimeout(7000)

const DB_NAME = 'test_db_store'

describe('Cache', function (this: {
  dbConnection: Connection;
}) {
  afterEach(async () => {
    if (this.dbConnection && this.dbConnection.isConnected) {
      await resetDatabase(this.dbConnection)
      await deleteDatabase(this.dbConnection, DB_NAME)
    }
  })
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)
  })

  test('Should add a new scheduled transaction', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

    const date = addMinutes(new Date(), -2)

    const id = await store.save({
      index: 1,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: '',
      blockNumber: 1
    })

    const count = await repository.count()

    expect(id).toBeGreaterThan(0)
    expect(count).toBe(1)
  })

  test('Should get latest blockNumber', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

    const date = addMinutes(new Date(), -2)

    await store.save({
      index: 1,
      blockNumber: 20,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })
    await store.save({
      index: 2,
      blockNumber: 90,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })
    await store.save({
      index: 3,
      blockNumber: 40,
      from: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })

    const lastBlockNumber = await store.getLastSyncedBlock()

    const count = await repository.count()

    expect(count).toBe(3)
    expect(lastBlockNumber).toBe(90)
  })
})
