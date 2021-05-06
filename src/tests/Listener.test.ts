import Web3 from 'web3'
import { Listener, newScheduledTransactionsError } from '../Listener'
import { addMinutes } from 'date-fns'
import { getMethodSigIncData } from './utils'
import { ISetup, setupContracts } from './setupContracts'
import { BLOCKCHAIN_WS_URL } from './constants'

const { toBN } = Web3.utils

jest.setTimeout(17000)

describe('Listener', function (this: {
  setup: ISetup
}) {
  beforeEach(async () => {
    this.setup = await setupContracts()
  })

  test('Should execute callback after schedule a new transaction', async (done) => {
    const provider = new Listener(BLOCKCHAIN_WS_URL, this.setup.oneShotScheduleContractAddress)

    provider.listenNewScheduledTransactions(async (event) => {
      expect(event).toBeDefined()
      expect(event.index).toBe(0)
      expect(event.blockNumber).toBeGreaterThan(0)
      await provider.disconnect()
      done()
    })

    const timestamp = addMinutes(new Date(), 15)

    await this.setup.scheduleTransaction(0, getMethodSigIncData(this.setup.web3), toBN(0), timestamp)
  })

  test('Should not execute new scheduled tx callback when disconnected', async () => {
    expect.assertions(2)

    const callback = jest.fn()

    const listener = new Listener(BLOCKCHAIN_WS_URL, this.setup.oneShotScheduleContractAddress)

    listener.on(newScheduledTransactionsError, (error) => {
      expect(error.message).toEqual('connection not open on send()')
      expect(callback).not.toBeCalled()
    })

    listener.listenNewScheduledTransactions(callback)

    await listener.disconnect()

    const timestamp = addMinutes(new Date(), 15)

    await this.setup.scheduleTransaction(0, getMethodSigIncData(this.setup.web3), toBN(0), timestamp)
  })
})
