import { deleteDatabase, resetDatabase, createSqliteConnection } from './db'
import { getConnection } from 'typeorm'
import { ScheduledTransaction } from './entities'
import Cache from './index'
import { addMinutes } from 'date-fns'

jest.setTimeout(7000)

const DB_NAME = 'test_db_store'

describe('Cache', () => {
  afterEach(async () => {
    await resetDatabase(getConnection())
    await deleteDatabase(getConnection(), DB_NAME)
  })

  test('Should add a new scheduled transaction', async () => {
    const connection = await createSqliteConnection(DB_NAME)
    const repository = connection.getRepository(ScheduledTransaction)

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
    const connection = await createSqliteConnection(DB_NAME)
    const repository = connection.getRepository(ScheduledTransaction)

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
