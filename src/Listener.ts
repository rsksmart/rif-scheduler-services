import { EventEmitter } from 'events'
import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contracts/OneShotSchedule.json'
import { OneShotSchedule } from './contracts/types/OneShotSchedule'
import IMetatransaction from './common/IMetatransaction'
import parseBlockchainTimestamp from './common/parseBlockchainTimestamp'

export const newScheduledTransactionsError = 'newScheduledTransactionsError'
export const webSocketProviderError = 'webSocketProviderError'

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export class Listener extends EventEmitter {
  private webSocketProvider: WebsocketProvider;
  private contract: OneShotSchedule;

  constructor (rpcUrl: string, contractAddress: string) {
    super()

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      rpcUrl
    )

    const web3 = new Web3(this.webSocketProvider)

    this.contract = (new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    ) as any) as OneShotSchedule
  }

  async listenNewScheduledTransactions (
    invoke: (eventValues: IMetatransaction) => Promise<void>
  ) {
    this.contract.events.ExecutionRequested(
      { fromBlock: 'latest' },
      async (error, event) => {
        if (error) return this.emit(newScheduledTransactionsError, error)

        invoke({
          blockNumber: event.blockNumber,
          id: event.returnValues.id,
          timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
        })
      }
    )
  }

  async disconnect (): Promise<void> {
    return new Promise((resolve) => {
      this.webSocketProvider.on('end', () => {
        resolve()
      })

      this.webSocketProvider.on('error', () => {
        this.emit(webSocketProviderError)
        resolve()
      })

      this.webSocketProvider.disconnect(0, 'close app')
    })
  }
}
