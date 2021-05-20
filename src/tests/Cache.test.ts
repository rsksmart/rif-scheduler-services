import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase } from './utils'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { addMinutes } from 'date-fns'
import { EMetatransactionState } from '../common/IMetatransaction'

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

    const id = await this.cache.save({
      id: 'hashedid1',
      timestamp: date,
      blockNumber: 1
    })

    const count = await this.repository.count()

    expect(id).toBe('hashedid1')
    expect(count).toBe(1)
  })

  test('Should get latest blockNumber', async () => {
    const date = addMinutes(new Date(), -2)

    await this.cache.save({
      id: 'hashedid1',
      blockNumber: 20,
      timestamp: date
    })
    await this.cache.save({
      id: 'hashedid2',
      blockNumber: 90,
      timestamp: date
    })
    await this.cache.save({
      id: 'hashedid3',
      blockNumber: 40,
      timestamp: date
    })

    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const count = await this.repository.count()

    expect(count).toBe(3)
    expect(lastBlockNumber).toBe(90)
  })

  test('Should be able to change a tx state', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      timestamp: date,
      blockNumber: 1
    })

    const count = await this.repository.count()
    const initialState = (await this.repository.findOne({
      where: {
        id
      }
    }))?.state

    await this.cache.changeState(id, EMetatransactionState.ExecutionSuccessful)

    const newState = (await this.repository.findOne({
      where: {
        id
      }
    }))?.state

    expect(count).toBe(1)
    expect(initialState).not.toBe(newState)
    expect(newState).toBe(EMetatransactionState.ExecutionSuccessful)
  })

  test('Should be able to save a reason for the state change', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      timestamp: date,
      blockNumber: 1
    })

    const count = await this.repository.count()
    const initialState = (await this.repository.findOne({
      where: {
        id
      }
    }))?.state

    await this.cache.changeState(id, EMetatransactionState.ExecutionFailed, 'Failed because it`s a test')

    const result = (await this.repository.findOne({
      where: {
        id
      }
    }))

    expect(count).toBe(1)
    expect(result).toBeDefined()
    expect(initialState).not.toBe(result?.state)
    expect(result?.state).toBe(EMetatransactionState.ExecutionFailed)
    expect(result?.reason).toBe('Failed because it`s a test')
  })
})
