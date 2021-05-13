import { addMinutes } from 'date-fns'
import { createDbConnection } from '../common/createDbConnection'
import { deleteDatabase, resetDatabase } from './utils'
import { deployAllContracts, ISetup, setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { Connection, Repository } from 'typeorm'
import { ScheduledTransaction } from '../common/entities'
import { Cache } from '../Cache'
import { Collector } from '../Collector'
import IMetatransaction, { EMetatransactionState } from '../common/IMetatransaction'
import { BLOCKCHAIN_HTTP_URL, MNEMONIC_PHRASE } from './constants'
import Web3 from 'web3'

jest.setTimeout(17000)

const DB_NAME = 'test_db_collector'

describe('Collector', function (this: {
  dbConnection: Connection;
  cache: Cache;
  repository: Repository<ScheduledTransaction>;
  web3: Web3;
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

    this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)

    const contracts = await deployAllContracts(this.web3)
    this.setup = await setupContracts(
      this.web3,
      contracts.tokenAddress,
      contracts.counterAddress,
      contracts.oneShotScheduleAddress
    )

    await sendBalanceToProviderAccount(this.web3, MNEMONIC_PHRASE, BLOCKCHAIN_HTTP_URL)
  })

  test('Should collect all transactions with status scheduled until the specified timestamp', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction: IMetatransaction = {
      id: 'none',
      requestor: '123',
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

  test('Should collect transactions only with status scheduled', async () => {
    const timestamp = addMinutes(new Date(), 30)

    const mockMetatransaction: IMetatransaction = {
      id: 'none',
      requestor: '123',
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
      id: 'hashedid1',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid2',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeStatus('hashedid2', EMetatransactionState.ExecutionSuccessful)
    await this.cache.save({
      ...mockMetatransaction,
      id: 'hashedid3',
      timestamp: addMinutes(timestamp, -10)
    })
    await this.cache.changeStatus('hashedid3', EMetatransactionState.ExecutionFailed)

    const count = await this.repository.count()

    expect(count).toBe(3)

    const collector = new Collector(this.repository)
    const result = await collector.collectSince(timestamp)

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('hashedid1')
  })
})
