import { createCoreInstance, Environment, setupDemo } from './scripts'

require('dotenv').config()

const environment: Environment = {
  DB_NAME: process.env.DB_NAME as string,
  REQUIRED_CONFIRMATIONS: parseInt(process.env.REQUIRED_CONFIRMATIONS as string),
  BLOCKCHAIN_WS_URL: process.env.BLOCKCHAIN_WS_URL as string,
  BLOCKCHAIN_HTTP_URL: process.env.BLOCKCHAIN_HTTP_URL as string,
  RIF_SCHEDULER_ADDRESS: process.env.RIF_SCHEDULER_ADDRESS as string,
  RIF_SCHEDULER_START_FROM_BLOCK_NUMBER:
    parseInt(process.env.RIF_SCHEDULER_START_FROM_BLOCK_NUMBER as string),
  RIF_SCHEDULER_BLOCKS_CHUNK_SIZE:
    parseInt(process.env.RIF_SCHEDULER_BLOCKS_CHUNK_SIZE as string),
  COUNTER_ADDRESS: process.env.COUNTER_ADDRESS as string,
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS as string,
  MNEMONIC_PHRASE: process.env.MNEMONIC_PHRASE as string,
  SCHEDULER_CRON_EXPRESSION: process.env.SCHEDULER_CRON_EXPRESSION as string,
  LOG_FILE: process.env.LOG_FILE as string === 'true'
}

const init = async () => {
  const core = await createCoreInstance(environment)

  if (process.argv.includes('--demo')) {
    await setupDemo(environment)
  }

  core.start()
}

init()
