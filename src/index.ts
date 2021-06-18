import { setupDemo } from './tests/setupDemo'
import { ScheduledTransaction } from './common/entities'
import { createDbConnection } from './common/createDbConnection'
import { Cache } from './Cache'
import { WebSocketListener } from './WebSocketListener'
import { PollingListener } from './PollingListener'
import { Recoverer } from './Recoverer'
import { Collector } from './Collector'
import { Scheduler } from './Scheduler'
import { Executor } from './Executor'
import Core from './Core'
import { BlockchainDate } from './common/BlockchainDate'
import Store from './common/Store'
import { IListener } from './IListener'
require('dotenv').config()

const environment = {
  DB_NAME: process.env.DB_NAME as string,
  REQUIRED_CONFIRMATIONS: parseInt(process.env.REQUIRED_CONFIRMATIONS as string),
  BLOCKCHAIN_WS_URL: process.env.BLOCKCHAIN_WS_URL as string,
  BLOCKCHAIN_HTTP_URL: process.env.BLOCKCHAIN_HTTP_URL as string,
  ONE_SHOT_SCHEDULER_ADDRESS: process.env.ONE_SHOT_SCHEDULER_ADDRESS as string,
  ONE_SHOT_SCHEDULER_START_FROM_BLOCK_NUMBER: parseInt(process.env.ONE_SHOT_SCHEDULER_START_FROM_BLOCK_NUMBER as string),
  ONE_SHOT_SCHEDULER_BLOCKS_CHUNK_SIZE: parseInt(process.env.ONE_SHOT_SCHEDULER_BLOCKS_CHUNK_SIZE as string),
  COUNTER_ADDRESS: process.env.COUNTER_ADDRESS as string,
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS as string,
  MNEMONIC_PHRASE: process.env.MNEMONIC_PHRASE as string,
  SCHEDULER_CRON_EXPRESSION: process.env.SCHEDULER_CRON_EXPRESSION as string
}

const createCoreInstance = async () => {
  const dbConnection = await createDbConnection(environment.DB_NAME)

  const repository = dbConnection.getRepository(ScheduledTransaction)

  const cache = new Cache(repository)
  let listener: IListener = new PollingListener(environment.BLOCKCHAIN_WS_URL, environment.ONE_SHOT_SCHEDULER_ADDRESS)
  if (process.argv.includes('--websocket')) {
    listener = new WebSocketListener(environment.BLOCKCHAIN_WS_URL, environment.ONE_SHOT_SCHEDULER_ADDRESS)
  }

  const recoverer = new Recoverer(environment.BLOCKCHAIN_HTTP_URL, environment.ONE_SHOT_SCHEDULER_ADDRESS)
  const executor = new Executor(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.ONE_SHOT_SCHEDULER_ADDRESS,
    environment.REQUIRED_CONFIRMATIONS,
    environment.MNEMONIC_PHRASE
  )
  const collector = new Collector(repository)
  const scheduler = new Scheduler(environment.SCHEDULER_CRON_EXPRESSION)
  const blockchainDate = new BlockchainDate(environment.BLOCKCHAIN_HTTP_URL)

  return new Core(recoverer, listener, cache, collector, executor, scheduler, blockchainDate, new Store(), {
    startFromBlockNumber: environment.ONE_SHOT_SCHEDULER_START_FROM_BLOCK_NUMBER,
    blocksChunkSize: environment.ONE_SHOT_SCHEDULER_BLOCKS_CHUNK_SIZE
  })
}

const init = async () => {
  const core = await createCoreInstance()

  if (process.argv.includes('--demo')) {
    await setupDemo(environment)
  }

  core.start()
}

init()
