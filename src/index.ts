import Web3 from 'web3'
import { ISetup, setupContracts } from './tests/setupContracts'
import { sendBalanceToProviderAccount } from './tests/sendBalanceToProviderAccount'
import { addMinutes } from 'date-fns'
import { getMethodSigIncData } from './tests/utils'
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

const { toBN } = Web3.utils

const environment = {
  DB_NAME: process.env.DB_NAME as string,
  REQUIRED_CONFIRMATIONS: parseInt(process.env.REQUIRED_CONFIRMATIONS as string),
  BLOCKCHAIN_WS_URL: process.env.BLOCKCHAIN_WS_URL as string,
  BLOCKCHAIN_HTTP_URL: process.env.BLOCKCHAIN_HTTP_URL as string,
  ONE_SHOOT_SCHEDULER_ADDRESS: process.env.ONE_SHOOT_SCHEDULER_ADDRESS as string,
  COUNTER_ADDRESS: process.env.COUNTER_ADDRESS as string,
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS as string,
  MNEMONIC_PHRASE: process.env.MNEMONIC_PHRASE as string
}

const createCoreInstance = async (setup: ISetup) => {
  const dbConnection = await createDbConnection(environment.DB_NAME)

  const repository = dbConnection.getRepository(ScheduledTransaction)

  const cache = new Cache(repository)
  const listener = new Listener(environment.BLOCKCHAIN_WS_URL, setup.oneShotScheduleContractAddress)
  const recoverer = new Recoverer(environment.BLOCKCHAIN_HTTP_URL, setup.oneShotScheduleContractAddress)
  const executor = new Executor(
    environment.BLOCKCHAIN_HTTP_URL,
    setup.oneShotScheduleContractAddress,
    environment.REQUIRED_CONFIRMATIONS,
    environment.MNEMONIC_PHRASE
  )
  const collector = new Collector(repository)
  const scheduler = new Scheduler()

  return new Core(recoverer, listener, cache, collector, executor, scheduler)
}

const init = async () => {
  console.log('Starting....')
  const web3 = new Web3(environment.BLOCKCHAIN_HTTP_URL)
  const setup = await setupContracts(
    web3,
    environment.TOKEN_ADDRESS,
    environment.COUNTER_ADDRESS,
    environment.ONE_SHOOT_SCHEDULER_ADDRESS
  )
  console.log('Contracts setup')

  await sendBalanceToProviderAccount(web3, environment.MNEMONIC_PHRASE, environment.BLOCKCHAIN_HTTP_URL)
  console.log('Sended balance to provider account')

  const executeAt = addMinutes(new Date(), 3)

  const incData = getMethodSigIncData(web3)

  await setup.scheduleTransaction(0, incData, toBN(0), executeAt)
  console.log('Transaction scheduled')

  const core = await createCoreInstance(setup)

  core.start()
  console.log('Started')
}

init()
