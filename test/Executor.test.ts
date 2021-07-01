import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { addMinutes } from 'date-fns'
import { time } from '@openzeppelin/test-helpers'
import { Executor } from '../src/model'
import {
  deployAllContracts, getAccounts, ISetup, setupContracts, sendBalanceToProviderAccount
} from '../src/scripts'
import { BLOCKCHAIN_HTTP_URL, MNEMONIC_PHRASE } from './constants'
import ERC677Data from '../src/scripts/contracts/ERC677.json'
import { BlockchainDate } from '../src/time'

jest.setTimeout(17000)

describe('Executor', function (this: {
  setup: ISetup,
  web3: Web3,
  blockchainDate: BlockchainDate;
  contracts: {
    tokenAddress: string;
    counterAddress: string;
    rifSchedulerAddress: string;
  }
}) {
  beforeEach(async () => {
    this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)

    this.contracts = await deployAllContracts(this.web3)
    this.setup = await setupContracts(
      this.web3,
      this.contracts.tokenAddress,
      this.contracts.counterAddress,
      this.contracts.rifSchedulerAddress
    )
    this.blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

    await sendBalanceToProviderAccount(this.web3, MNEMONIC_PHRASE, BLOCKCHAIN_HTTP_URL)
  })

  test('Should execute a scheduled tx', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 5)

    const transaction = await this.setup.scheduleTransaction({ plan: 0, timestamp })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.rifScheduler.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    const result = await txExecutor.execute(transaction)

    expect(await this.web3.eth.getTransactionReceipt(result.tx!)).toBeDefined()
  })

  test(
    'Should throw error when execute a scheduled tx without the confirmations required',
    async () => {
      const CONFIRMATIONS_REQUIRED = 10

      const currentDate = await this.blockchainDate.now()
      const timestamp = addMinutes(currentDate, 5)

      const transaction = await this.setup.scheduleTransaction({ plan: 0, timestamp })

      const txExecutor = new Executor(
        BLOCKCHAIN_HTTP_URL,
        this.setup.rifScheduler.options.address,
        CONFIRMATIONS_REQUIRED,
        MNEMONIC_PHRASE
      )

      const result = await txExecutor.execute(transaction)
      expect(result.error!.message).toEqual('Minimum confirmations required')
    })

  test('Should throw error when execute a scheduled tx twice', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 5)

    const transaction = await this.setup.scheduleTransaction({ plan: 0, timestamp })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.rifScheduler.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)

    const result2 = await txExecutor.execute(transaction)

    expect(result2.error!.message).toEqual('State must be Scheduled')
  })

  test('Should execute a some other contract scheduled', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 5)

    const accounts = await getAccounts(this.web3)

    const executeAddress = this.contracts.tokenAddress

    const { executeGas, executeMethod } = await this.setup.getExecutionParameters(
      ERC677Data.abi as AbiItem[],
      executeAddress,
      'balanceOf',
      [accounts.requestor]
    )

    const transaction = await this.setup.scheduleTransaction({
      plan: 0,
      timestamp,
      executeMethod,
      executeAddress,
      executeGas
    })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      this.setup.rifScheduler.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await this.web3.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    const result = await txExecutor.execute(transaction)

    expect(await this.web3.eth.getTransactionReceipt(result.tx!)).toBeDefined()
  })
})
