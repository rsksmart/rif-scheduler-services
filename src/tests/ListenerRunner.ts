import Web3 from 'web3'
import { addMinutes } from 'date-fns'
import { deployAllContracts, ISetup, setupContracts } from '../scripts/setupContracts'
import { BLOCKCHAIN_HTTP_URL } from './constants'
import { BlockchainDate } from '../time'
import { EListenerEvents, IListener } from '../model'
import { sleep } from './utils'

jest.setTimeout(17000)

export function runListenerWith (name: string, Listener: any, listenerRpcUrl: string) {
  const WAIT_MILLISECONDS = 1000

  describe(name, function (this: {
    setup: ISetup,
    web3: Web3,
    blockchainDate: BlockchainDate;
    listener: IListener;
  }) {
    beforeEach(async () => {
      this.web3 = new Web3(BLOCKCHAIN_HTTP_URL)

      this.blockchainDate = new BlockchainDate(BLOCKCHAIN_HTTP_URL)

      const contracts = await deployAllContracts(this.web3)
      this.setup = await setupContracts(
        this.web3,
        contracts.tokenAddress,
        contracts.counterAddress,
        contracts.rifSchedulerAddress
      )

      this.listener = new Listener(
        listenerRpcUrl,
        this.setup.rifScheduler.options.address
      )
      if ((this.listener as any).pollingInterval) {
        (this.listener as any).pollingInterval = WAIT_MILLISECONDS
      }
    })

    test('Should execute callback after schedule a new transaction', async (done) => {
      this.listener.on(EListenerEvents.ExecutionRequested, async (result) => {
        expect(result).toBeDefined()
        expect(result.id).toBeDefined()
        expect(result.id).not.toBe('')
        expect(result.timestamp).toBeDefined()
        expect(result.blockNumber).toBeGreaterThan(0)
        await this.listener.disconnect()
        done()
      })

      this.listener.listenNewExecutionRequests()

      const currentDate = await this.blockchainDate.now()
      const timestamp = addMinutes(currentDate, 15)

      await this.setup.scheduleTransaction({ plan: 0, timestamp })
    })

    test('Should not execute new scheduled tx callback when disconnected', async () => {
      expect.assertions(2)

      const callback = jest.fn()
      const errorCallback = jest.fn()

      this.listener.on(EListenerEvents.ExecutionRequested, callback)
      this.listener.on(EListenerEvents.ExecutionRequestedError, errorCallback)

      // await until is connected
      await this.listener.listenNewExecutionRequests()

      await this.listener.disconnect()

      const currentDate = await this.blockchainDate.now()
      const timestamp = addMinutes(currentDate, 15)

      await this.setup.scheduleTransaction({ plan: 0, timestamp })

      await sleep(WAIT_MILLISECONDS * 2)

      expect(callback).not.toBeCalled()
      expect(errorCallback).not.toBeCalled()
    })
  })
}
