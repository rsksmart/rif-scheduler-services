import Web3 from 'web3'
import { Executor } from '../Executor'
import { addMinutes } from 'date-fns'
import { time } from '@openzeppelin/test-helpers'
import { deployAllContracts, getAccounts, ISetup, setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { BLOCKCHAIN_HTTP_URL, MNEMONIC_PHRASE } from './constants'
import ERC677Data from '../contracts/ERC677.json'
import { AbiItem } from 'web3-utils'
import { BlockchainDate } from '../common/BlockchainDate'

jest.setTimeout(17000)

describe('Executor', () => {
  let setup: ISetup | undefined
  let web3: Web3 | undefined
  let blockchainDate: BlockchainDate | undefined
  let contracts: {
    tokenAddress: string;
    counterAddress: string;
    oneShotScheduleAddress: string;
  } | undefined

  beforeEach(async () => {
    web3 = new Web3(BLOCKCHAIN_HTTP_URL)

    contracts = await deployAllContracts(web3!)
    setup = await setupContracts(
      web3!,
      contracts!.tokenAddress,
      contracts!.counterAddress,
      contracts!.oneShotScheduleAddress
    )
    blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

    await sendBalanceToProviderAccount(web3!, MNEMONIC_PHRASE, BLOCKCHAIN_HTTP_URL)
  })

  afterEach(() => {
    setup = undefined
    web3 = undefined
    blockchainDate = undefined
    contracts = undefined
  })

  test('Should execute a scheduled tx', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const currentDate = await blockchainDate!.now()
    const timestamp = addMinutes(currentDate, 5)

    const transaction = await setup!.scheduleTransaction({ plan: 0, timestamp })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      setup!.oneShotSchedule.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await web3!.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)
  })

  test('Should throw error when execute a scheduled tx without the confirmations required', async () => {
    const CONFIRMATIONS_REQUIRED = 10

    const currentDate = await blockchainDate!.now()
    const timestamp = addMinutes(currentDate, 5)

    const transaction = await setup!.scheduleTransaction({ plan: 0, timestamp })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      setup!.oneShotSchedule.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    await expect(txExecutor.execute(transaction))
      .rejects
      .toThrow('Minimum confirmations required')
  })

  test('Should throw error when execute a scheduled tx twice', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const currentDate = await blockchainDate!.now()
    const timestamp = addMinutes(currentDate, 5)

    const transaction = await setup!.scheduleTransaction({ plan: 0, timestamp })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      setup!.oneShotSchedule.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await web3!.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)

    await expect(txExecutor.execute(transaction))
      .rejects
      .toThrow('State must be Scheduled')
  })

  test('Should execute a some other contract scheduled', async () => {
    const CONFIRMATIONS_REQUIRED = 1

    const currentDate = await blockchainDate!.now()
    const timestamp = addMinutes(currentDate, 5)

    const accounts = await getAccounts(web3!)

    const executeAddress = contracts!.tokenAddress

    const { executeGas, executeMethod } = await setup!.getExecutionParameters(
      ERC677Data.abi as AbiItem[],
      executeAddress,
      'balanceOf',
      [accounts.requestor]
    )

    const transaction = await setup!.scheduleTransaction({
      plan: 0,
      timestamp,
      executeMethod,
      executeAddress,
      executeGas
    })

    const txExecutor = new Executor(
      BLOCKCHAIN_HTTP_URL,
      setup!.oneShotSchedule.options.address,
      CONFIRMATIONS_REQUIRED,
      MNEMONIC_PHRASE
    )

    const currentBlockNumber = await web3!.eth.getBlockNumber()
    await time.advanceBlockTo(currentBlockNumber + CONFIRMATIONS_REQUIRED)

    await txExecutor.execute(transaction)
  })
})
