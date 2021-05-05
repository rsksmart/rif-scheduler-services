import { EventEmitter } from 'events'
import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contract/OneShotSchedule.json'
import IMetatransaction from './common/IMetatransaction'
import parseEvent from './common/parseEvent'

export const newScheduledTransactionsError = 'newScheduledTransactionsError'
export const webSocketProviderError = 'webSocketProviderError'

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export class Listener extends EventEmitter {
  private webSocketProvider: WebsocketProvider;
  private contract: any;

  constructor (rpcUrl: string, contractAddress: string) {
    super()

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      rpcUrl
    )

    const web3 = new Web3(this.webSocketProvider)

    this.contract = new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    )
  }

  async listenNewScheduledTransactions (
    callback: (eventValues: IMetatransaction) => Promise<void>
  ) {
    this.contract.events.MetatransactionAdded(
      {},
      (error, event) => {
        if (error) return this.emit(newScheduledTransactionsError, error)
        callback(parseEvent(event))
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
