import Web3 from 'web3'
import { Executor } from '../Executor'
import { addMinutes } from 'date-fns'
import { time } from '@openzeppelin/test-helpers'
import { getMethodSigIncData } from './utils'
import { ISetup, setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { BLOCKCHAIN_HTTP_URL, MNEMONIC_PHRASE } from './constants'

const { toBN } = Web3.utils

jest.setTimeout(17000)

describe('Executor', function (this: {
  setup: ISetup
}) {
  beforeEach(async () => {
    this.setup = await setupContracts()

    await sendBalanceToProviderAccount(this.setup.web3)
  })

  test('Should execute a scheduled tx', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const incData = getMethodSigIncData(this.setup.web3)
    const timestamp = addMinutes(new Date(), 5)

    const transaction = await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp)

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.oneShotScheduleContractAddress,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await this.setup.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)
  })

  test('Should throw error when execute a scheduled tx without the confirmations required', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const incData = getMethodSigIncData(this.setup.web3)
    const timestamp = addMinutes(new Date(), 5)

    const transaction = await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp)

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.oneShotScheduleContractAddress,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    await expect(txExecutor.execute(transaction))
      .rejects
      .toThrow('Minimum confirmations required')
  })

  test('Should throw error when execute a scheduled tx twice', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const incData = getMethodSigIncData(this.setup.web3)
    const timestamp = addMinutes(new Date(), 5)

    const transaction = await this.setup.scheduleTransaction(0, incData, toBN(0), timestamp)

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.oneShotScheduleContractAddress,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await this.setup.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)

    await expect(txExecutor.execute(transaction))
      .rejects
      .toThrow('Already executed')
  })
})
