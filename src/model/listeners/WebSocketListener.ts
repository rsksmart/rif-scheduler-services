import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { Listener } from './ListenerBase'

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export class WebSocketListener extends Listener {
  private webSocketProvider: WebsocketProvider;
  private contract: RIFScheduler;
  private isConnected: boolean;

  constructor (rpcUrl: string, contractAddress: string) {
    super()

    this.isConnected = true

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      rpcUrl
    )

    const web3 = new Web3(this.webSocketProvider)

    this.contract = (new web3.eth.Contract(
      RIFSchedulerData.abi as AbiItem[],
      contractAddress
    ) as any) as RIFScheduler
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
