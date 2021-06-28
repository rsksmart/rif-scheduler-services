import { ScheduledTransaction } from '../common/entities'
import { createDbConnection } from '../common/createDbConnection'
import { Cache } from '../Cache'
import { WebSocketListener } from '../WebSocketListener'
import { PollingListener } from '../PollingListener'
import { Recoverer } from '../Recoverer'
import { Collector } from '../Collector'
import { Scheduler } from '../Scheduler'
import { Executor } from '../Executor'
import Core from '../Core'
import { BlockchainDate } from '../common/BlockchainDate'
import Store from '../common/Store'
import { Listener } from '../Listener'

export type Environment = {
  DB_NAME: string
  REQUIRED_CONFIRMATIONS: number
  BLOCKCHAIN_WS_URL: string
  BLOCKCHAIN_HTTP_URL: string
  RIF_SCHEDULER_ADDRESS: string
  RIF_SCHEDULER_START_FROM_BLOCK_NUMBER: number
  RIF_SCHEDULER_BLOCKS_CHUNK_SIZE: number
  COUNTER_ADDRESS: string
  TOKEN_ADDRESS: string
  MNEMONIC_PHRASE: string
  SCHEDULER_CRON_EXPRESSION: string
}

export const createCoreInstance = async (environment: Environment) => {
  const dbConnection = await createDbConnection(environment.DB_NAME)

  const repository = dbConnection.getRepository(ScheduledTransaction)

  const cache = new Cache(repository)
  let listener: Listener = new PollingListener(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.RIF_SCHEDULER_ADDRESS
  )
  if (process.argv.includes('--websocket')) {
    listener = new WebSocketListener(
      environment.BLOCKCHAIN_WS_URL,
      environment.RIF_SCHEDULER_ADDRESS
    )
  }

  const recoverer = new Recoverer(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.RIF_SCHEDULER_ADDRESS
  )
  const executor = new Executor(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.RIF_SCHEDULER_ADDRESS,
    environment.REQUIRED_CONFIRMATIONS,
    environment.MNEMONIC_PHRASE
  )
  const collector = new Collector(repository)
  const scheduler = new Scheduler(environment.SCHEDULER_CRON_EXPRESSION)
  const blockchainDate = new BlockchainDate(environment.BLOCKCHAIN_HTTP_URL)

  return new Core(
    recoverer,
    listener,
    cache,
    collector,
    executor,
    scheduler,
    blockchainDate,
    new Store(),
    {
      startFromBlockNumber: environment.RIF_SCHEDULER_START_FROM_BLOCK_NUMBER,
      blocksChunkSize: environment.RIF_SCHEDULER_BLOCKS_CHUNK_SIZE
    })
}
