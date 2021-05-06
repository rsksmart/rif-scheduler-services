import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase } from './utils'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { addMinutes } from 'date-fns'
import { EMetatransactionStatus } from '../common/IMetatransaction'

jest.setTimeout(7000)

const DB_NAME = 'test_db_store'

describe('Cache', function (this: {
  dbConnection: Connection;
  repository: Repository<ScheduledTransaction>
  cache: Cache
}) {
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)
    this.repository = this.dbConnection.getRepository(ScheduledTransaction)
    this.cache = new Cache(this.repository)
  })

  afterEach(async () => {
    if (this.dbConnection && this.dbConnection.isConnected) {
      await resetDatabase(this.dbConnection)
      await deleteDatabase(this.dbConnection, DB_NAME)
    }
  })

  test('Should add a new scheduled transaction', async () => {
    const date = addMinutes(new Date(), -2)

    const key = await this.cache.save({
      id: 'hashedid1',
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: '',
      blockNumber: 1
    })

    const count = await this.repository.count()

    expect(key).toBeGreaterThan(0)
    expect(count).toBe(1)
  })

  test('Should get latest blockNumber', async () => {
    const date = addMinutes(new Date(), -2)

    await this.cache.save({
      id: 'hashedid1',
      blockNumber: 20,
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })
    await this.cache.save({
      id: 'hashedid2',
      blockNumber: 90,
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })
    await this.cache.save({
      id: 'hashedid3',
      blockNumber: 40,
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: ''
    })

    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const count = await this.repository.count()

    expect(count).toBe(3)
    expect(lastBlockNumber).toBe(90)
  })

  test('Should be able to change a tx status', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: '',
      blockNumber: 1
    })

    const count = await this.repository.count()
    const initialStatus = (await this.repository.findOne({
      where: {
        id
      }
    }))?.status

    await this.cache.changeStatus(id, EMetatransactionStatus.ExecutionSuccessful)

    const newStatus = (await this.repository.findOne({
      where: {
        id
      }
    }))?.status

    expect(count).toBe(1)
    expect(initialStatus).not.toBe(newStatus)
    expect(newStatus).toBe(EMetatransactionStatus.ExecutionSuccessful)
  })

  test('Should be able to save a reason for the status change', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      requestor: '123',
      plan: 0,
      to: '456',
      data: '',
      gas: 100,
      timestamp: date,
      value: '',
      blockNumber: 1
    })

    const count = await this.repository.count()
    const initialStatus = (await this.repository.findOne({
      where: {
        id
      }
    }))?.status

    await this.cache.changeStatus(id, EMetatransactionStatus.ExecutionFailed, 'Failed because it`s a test')

    const result = (await this.repository.findOne({
      where: {
        id
      }
    }))

    expect(count).toBe(1)
    expect(result).toBeDefined()
    expect(initialStatus).not.toBe(result?.status)
    expect(result?.status).toBe(EMetatransactionStatus.ExecutionFailed)
    expect(result?.reason).toBe('Failed because it`s a test')
  })
})
