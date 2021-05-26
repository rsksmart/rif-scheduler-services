import Web3 from 'web3'
import { Listener, newScheduledTransactionsError } from '../Listener'
import { addMinutes } from 'date-fns'
import { deployAllContracts, ISetup, setupContracts } from './setupContracts'
import { BLOCKCHAIN_HTTP_URL, BLOCKCHAIN_WS_URL } from './constants'
import { BlockchainDate } from '../common/BlockchainDate'

jest.setTimeout(17000)

describe('Listener', function (this: {
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

  test('Should execute callback after schedule a new transaction', async (done) => {
    const provider = new Listener(BLOCKCHAIN_WS_URL, this.setup.oneShotSchedule.options.address)

    provider.listenNewScheduledTransactions(async (event) => {
      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
      expect(event.id).not.toBe('')
      expect(event.timestamp).toBeDefined()
      expect(event.blockNumber).toBeGreaterThan(0)
      await provider.disconnect()
      done()
    })

    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 15)

    await this.setup.scheduleTransaction({ plan: 0, timestamp })
  })

  test('Should not execute new scheduled tx callback when disconnected', async () => {
    expect.assertions(2)

    const callback = jest.fn()

    const listener = new Listener(BLOCKCHAIN_WS_URL, this.setup.oneShotSchedule.options.address)

    listener.on(newScheduledTransactionsError, (error) => {
      expect(error.message).toEqual('connection not open on send()')
      expect(callback).not.toBeCalled()
    })

    listener.listenNewScheduledTransactions(callback)

    await listener.disconnect()

    const currentDate = await this.blockchainDate.now()
    const timestamp = addMinutes(currentDate, 15)

    await this.setup.scheduleTransaction({ plan: 0, timestamp })
  })
})
