import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contracts/OneShotSchedule.json'
import { OneShotSchedule } from './contracts/types/OneShotSchedule'
import { Listener } from './Listener'

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export class WebSocketListener extends Listener {
  private webSocketProvider: WebsocketProvider;
  private contract: OneShotSchedule;
  private isConnected: boolean;

  constructor (rpcUrl: string, contractAddress: string) {
    super()

    this.isConnected = true

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      rpcUrl
    )

    const web3 = new Web3(this.webSocketProvider)

    this.contract = (new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    ) as any) as OneShotSchedule
  }

  async listenNewExecutionRequests (
    startFromBlockNumber?: number
  ) : Promise<void> {
    this.contract.events.ExecutionRequested(
      { fromBlock: startFromBlockNumber || 'latest' },
      async (error, event) => {
        if (!this.isConnected) return

        if (error) return this.emitExecutionRequestedError(error)

        this.emitExecutionsRequested([event])
      }
    )
  }

  async disconnect (): Promise<void> {
    this.isConnected = false

    return new Promise((resolve) => {
      this.webSocketProvider.on('end', () => {
        resolve()
      })

      this.webSocketProvider.on('error', () => {
        this.emitProviderError()
        resolve()
      })

      this.webSocketProvider.disconnect(0, 'close app')
    })
  }
}
