import Web3 from 'web3'
import { Recoverer } from '../Recoverer'
import { addMinutes } from 'date-fns'
import { deployAllContracts, ISetup, setupContracts } from './setupContracts'
import { BLOCKCHAIN_HTTP_URL } from './constants'
import { BlockchainDate } from '../common/BlockchainDate'

jest.setTimeout(17000)

describe('Recoverer', function (this: {
  setup: ISetup,
  web3: Web3,
  blockchainDate: BlockchainDate;
}) {
  beforeEach(async () => {
    this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)

    this.blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

    const contracts = await deployAllContracts(this.web3)
    this.setup = await setupContracts(
      this.web3,
      contracts.tokenAddress,
      contracts.counterAddress,
      contracts.oneShotScheduleAddress
    )
  })

  test('Should get all past scheduled tx events', async () => {
    const NUMBER_OF_SCHEDULED_TX = 2
    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 15)

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      await this.setup.scheduleTransaction({ plan: 0, timestamp })
    }

    const recoverer = new Recoverer(
      BLOCKCHAIN_HTTP_URL,
      this.setup.oneShotSchedule.options.address
    )

    const result = await recoverer.recoverScheduledTransactions()

    expect(result.length).toBe(NUMBER_OF_SCHEDULED_TX)

    for (let i = 0; i < NUMBER_OF_SCHEDULED_TX; i++) {
      expect(result[i].id).toBeDefined()
      expect(result[i].id).not.toBe('')
      expect(result[i].timestamp).toBeDefined()
      expect(result[i].blockNumber).toBeGreaterThan(0)
    }
  })
})
