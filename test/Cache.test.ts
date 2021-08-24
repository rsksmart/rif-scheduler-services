import { Connection, Repository } from 'typeorm'
import { addMinutes } from 'date-fns'
import { ScheduledExecution, EExecutionState } from '../src/entities'
import { Cache, createDbConnection } from '../src/storage'
import { deleteDatabase, resetDatabase } from './utils'
import getTransactionHashByExecutionId from '../src/api/getTransactionHashByExecutionId'

jest.setTimeout(7000)

const DB_NAME = 'test_db_store'

describe('Cache', function (this: {
  dbConnection: Connection;
  repository: Repository<ScheduledExecution>
  cache: Cache
}) {
  beforeEach(async () => {
    this.dbConnection = await createDbConnection(DB_NAME)
    this.repository = this.dbConnection.getRepository(ScheduledExecution)
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

    await this.cache.changeState(id, EExecutionState.ExecutionSuccessful)

    const newState = (await this.repository.findOne({
      where: {
        id
      }
    }))?.state

    expect(count).toBe(1)
    expect(initialState).not.toBe(newState)
    expect(newState).toBe(EExecutionState.ExecutionSuccessful)
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

    // eslint-disable-next-line max-len
    await this.cache.changeState(id, EExecutionState.ExecutionFailed, 'Failed because it`s a test')

    const result = (await this.repository.findOne({
      where: {
        id
      }
    }))

    expect(count).toBe(1)
    expect(result).toBeDefined()
    expect(initialState).not.toBe(result?.state)
    expect(result?.state).toBe(EExecutionState.ExecutionFailed)
    expect(result?.reason).toBe('Failed because it`s a test')
  })

  test('[getTransactionHashByExecutionId] Should return a transactionHash with state successful', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      timestamp: date,
      blockNumber: 1
    })

    const txHash = '0x0...'

    await this.cache.changeState(id, EExecutionState.ExecutionSuccessful, txHash)

    const count = await this.repository.count()

    const transactionHash = await getTransactionHashByExecutionId(this.repository, id)

    expect(count).toBe(1)
    expect(transactionHash).toBe(txHash)
  })

  test('[getTransactionHashByExecutionId] Should return undefined with state different than successful', async () => {
    const date = addMinutes(new Date(), -2)
    const id = 'hashedid'

    await this.cache.save({
      id,
      timestamp: date,
      blockNumber: 1
    })

    const txHash = '0x0...'

    await this.cache.changeState(id, EExecutionState.Cancelled, txHash)

    const count = await this.repository.count()

    const transactionHash = await getTransactionHashByExecutionId(this.repository, id)

    expect(count).toBe(1)
    expect(transactionHash).not.toBeDefined()
  })
})
