import { setupDemo } from './tests/setupDemo'
import { ScheduledTransaction } from './common/entities'
import { createDbConnection } from './common/createDbConnection'
import { Cache } from './Cache'
import { Listener } from './Listener'
import { Recoverer } from './Recoverer'
import { Collector } from './Collector'
import { Scheduler } from './Scheduler'
import { Executor } from './Executor'
import Core from './Core'
require('dotenv').config()

const environment = {
  DB_NAME: process.env.DB_NAME as string,
  REQUIRED_CONFIRMATIONS: parseInt(process.env.REQUIRED_CONFIRMATIONS as string),
  BLOCKCHAIN_WS_URL: process.env.BLOCKCHAIN_WS_URL as string,
  BLOCKCHAIN_HTTP_URL: process.env.BLOCKCHAIN_HTTP_URL as string,
  ONE_SHOOT_SCHEDULER_ADDRESS: process.env.ONE_SHOOT_SCHEDULER_ADDRESS as string,
  COUNTER_ADDRESS: process.env.COUNTER_ADDRESS as string,
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS as string,
  MNEMONIC_PHRASE: process.env.MNEMONIC_PHRASE as string,
  SCHEDULER_CRON_EXPRESSION: process.env.SCHEDULER_CRON_EXPRESSION as string
}

const createCoreInstance = async () => {
  const dbConnection = await createDbConnection(environment.DB_NAME)

  const repository = dbConnection.getRepository(ScheduledTransaction)

  const cache = new Cache(repository)
  const listener = new Listener(environment.BLOCKCHAIN_WS_URL, environment.ONE_SHOOT_SCHEDULER_ADDRESS)
  const recoverer = new Recoverer(environment.BLOCKCHAIN_HTTP_URL, environment.ONE_SHOOT_SCHEDULER_ADDRESS)
  const executor = new Executor(
    environment.BLOCKCHAIN_HTTP_URL,
    environment.ONE_SHOOT_SCHEDULER_ADDRESS,
    environment.REQUIRED_CONFIRMATIONS,
    environment.MNEMONIC_PHRASE
  )
  const collector = new Collector(repository)
  const scheduler = new Scheduler(environment.SCHEDULER_CRON_EXPRESSION)

  return new Core(recoverer, listener, cache, collector, executor, scheduler)
}

const init = async () => {
  console.log('Starting....', environment)
  const core = await createCoreInstance()

  if (process.argv.includes('--demo')) {
    await setupDemo(environment)
  }

  core.start()
  console.log('Started')
}

init()
