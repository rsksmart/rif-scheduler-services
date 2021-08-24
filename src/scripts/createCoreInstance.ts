import tracer from 'tracer'
import Core from '../Core'
import {
  Recoverer, Collector, IListener, WebSocketListener, PollingListener, Scheduler, Executor, BatchRecoverer
} from '../model'
import { ScheduledExecution } from '../entities'
import { Cache, Store, createDbConnection } from '../storage'
import { BlockchainDate } from '../time'

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
  LOG_FILE: boolean
}

const loggerConsole = tracer.colorConsole()
const loggerFile = tracer.dailyfile({
  root: './storage/logs',
  maxLogFiles: 10,
  allLogsFileName: 'log',
  level: 0
})

export const createCoreInstance = async (environment: Environment) => {
  const dbConnection = await createDbConnection(environment.DB_NAME)

  const repository = dbConnection.getRepository(ScheduledExecution)

  const cache = new Cache(repository)
  let listener: IListener = new PollingListener(
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

  const batchRecoverer = new BatchRecoverer(recoverer, environment.RIF_SCHEDULER_BLOCKS_CHUNK_SIZE)

  const executor = new Executor(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.RIF_SCHEDULER_ADDRESS,
    environment.REQUIRED_CONFIRMATIONS,
    environment.MNEMONIC_PHRASE
  )

  const collector = new Collector(repository)

  const scheduler = new Scheduler(environment.SCHEDULER_CRON_EXPRESSION)

  const blockchainDate = new BlockchainDate(environment.BLOCKCHAIN_HTTP_URL)

  const logger = environment.LOG_FILE ? loggerFile : loggerConsole

  return new Core(
    batchRecoverer,
    listener,
    cache,
    collector,
    executor,
    scheduler,
    blockchainDate,
    new Store(),
    logger,
    {
      startFromBlockNumber: environment.RIF_SCHEDULER_START_FROM_BLOCK_NUMBER
    })
}
