import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import loggerFactory from '../loggerFactory'
import parseEvent from './parseEvent'

export class SchedulingsListener {
  private webSocketProvider: WebsocketProvider;
  private oneShotScheduleContract: any;
  private transactionScheduleAddress: string;

  constructor (rpcUrl: string, transactionScheduleAddress: string) {
    this.transactionScheduleAddress = transactionScheduleAddress

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      rpcUrl
    )

    const web3 = new Web3(this.webSocketProvider)

    this.oneShotScheduleContract = new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.transactionScheduleAddress
    )
  }

  async listenNewScheduledTransactions (
    callback: (eventValues: IMetatransaction) => Promise<void>
  ) {
    this.oneShotScheduleContract.events.MetatransactionAdded(
      {},
      (error, event) => {
        if (error) {
          loggerFactory().error(
            'The websocket connection is not opened',
            error
          )
          return
        }

        const newEvent = parseEvent(event)

        callback(newEvent)
      }
    )
  }

  async disconnect (): Promise<void> {
    return new Promise((resolve) => {
      this.webSocketProvider.on('end', () => {
        // console.log('WS closed')
        resolve()
      })
      this.webSocketProvider.on('error', () => {
        loggerFactory().error('Failed while the websocket was disconnecting')
        resolve()
      })
      this.webSocketProvider.disconnect(0, 'close app')
    })
  }
}
