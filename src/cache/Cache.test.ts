import { deleteDatabase, resetDatabase, createDbConnection } from './db'
import { Connection } from 'typeorm'
import { ScheduledTransaction } from './entities'
import Cache from './Cache'
import { addMinutes } from 'date-fns'
import { EMetatransactionStatus } from '../IMetatransaction'

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

  test('Should get all cached transactions pending to execute until the specified timestamp', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

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

    await store.save({
      ...mockMetatransaction,
      index: 1,
      timestamp: addMinutes(timestamp, -10)
    })
    await store.save({
      ...mockMetatransaction,
      index: 2,
      timestamp: addMinutes(timestamp, -20)
    })
    await store.save({
      ...mockMetatransaction,
      index: 3,
      timestamp: addMinutes(timestamp, -120)
    })
    await store.save({
      ...mockMetatransaction,
      index: 4,
      timestamp: addMinutes(timestamp, 1)
    })

    const count = await repository.count()

    expect(count).toBe(4)

    const result = await store.getScheduledTransactionsTo(timestamp)

    expect(result.length).toBe(3)

    result.forEach((item) => {
      expect(item.timestamp <= timestamp).toBeTruthy()
    })
  })

  test('Should get cached transactions only with status scheduled', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

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

    await store.save({
      ...mockMetatransaction,
      index: 1,
      timestamp: addMinutes(timestamp, -10)
    })
    await store.save({
      ...mockMetatransaction,
      index: 2,
      timestamp: addMinutes(timestamp, -10)
    })
    await store.changeStatus(2, EMetatransactionStatus.executed)
    await store.save({
      ...mockMetatransaction,
      index: 3,
      timestamp: addMinutes(timestamp, -10)
    })
    await store.changeStatus(3, EMetatransactionStatus.failed)

    const count = await repository.count()

    expect(count).toBe(3)

    const result = await store.getScheduledTransactionsTo(timestamp)

    expect(result.length).toBe(1)
    expect(result[0].index).toBe(1)
  })

  test('Should be able to change a tx status', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

    const date = addMinutes(new Date(), -2)
    const index = 1

    await store.save({
      index,
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
    const initialStatus = (await repository.findOne({
      where: {
        index
      }
    }))?.status

    await store.changeStatus(index, EMetatransactionStatus.executed)

    const newStatus = (await repository.findOne({
      where: {
        index
      }
    }))?.status

    expect(count).toBe(1)
    expect(initialStatus).not.toBe(newStatus)
    expect(newStatus).toBe(EMetatransactionStatus.executed)
  })

  test('Should be able to save a reason for the status change', async () => {
    const repository = this.dbConnection.getRepository(ScheduledTransaction)

    const store = new Cache(repository)

    const date = addMinutes(new Date(), -2)
    const index = 1

    await store.save({
      index,
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
    const initialStatus = (await repository.findOne({
      where: {
        index
      }
    }))?.status

    await store.changeStatus(index, EMetatransactionStatus.failed, 'Failed because it`s a test')

    const result = (await repository.findOne({
      where: {
        index
      }
    }))

    expect(count).toBe(1)
    expect(result).toBeDefined()
    expect(initialStatus).not.toBe(result?.status)
    expect(result?.status).toBe(EMetatransactionStatus.failed)
    expect(result?.reason).toBe('Failed because it`s a test')
  })
})
