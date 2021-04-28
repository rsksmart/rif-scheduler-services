import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import loggerFactory from '../loggerFactory'
import parseEvent from './parseEvent'

export interface IProvider {
  getPastScheduledTransactions(
    startFromBlock?: number
  ): Promise<IMetatransaction[]>;
  listenNewScheduledTransactions(
    callback: (eventValues: IMetatransaction) => Promise<void>
  ): Promise<void>;
  executeTransaction(transaction: IMetatransaction): Promise<void>;
  disconnect(): Promise<void>;
}
export class TxMinimumConfirmationsRequiredError extends Error {
  constructor (confirmationsRequired: number, currentConfirmations: number) {
    super(`Requires ${confirmationsRequired} confirmations but has ${currentConfirmations}`)

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxMinimumConfirmationsRequiredError.prototype)
  }
}

export class TxAlreadyExecutedError extends Error {
  constructor () {
    super('Already executed')

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxAlreadyExecutedError.prototype)
  }
}

export class TxInvalidError extends Error {
  constructor () {
    super('Invalid metatransaction')

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxInvalidError.prototype)
  }
}

// TODO: move this const to OneShotSchedule constructor
const BLOCKCHAIN_URL = 'ws://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

class OneShotSchedule implements IProvider {
  private web3: Web3;
  private webSocketProvider: WebsocketProvider;
  private oneShotScheduleContract: any;
  private transactionScheduleAddress: string;

  constructor (transactionScheduleAddress: string) {
    this.transactionScheduleAddress = transactionScheduleAddress

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      BLOCKCHAIN_URL
    )

    this.web3 = new Web3(this.webSocketProvider)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.transactionScheduleAddress
    )
  }

  async getPastScheduledTransactions (
    startFromBlock: number = 0
  ): Promise<IMetatransaction[]> {
    const pastEvents = await this.oneShotScheduleContract.getPastEvents(
      'MetatransactionAdded',
      {
        fromBlock: startFromBlock,
        toBlock: 'latest'
      }
    )

    return pastEvents.map(parseEvent)
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

export default OneShotSchedule

function shallowEqual (a: IMetatransaction, b: IMetatransaction) {
  for (const key in a) {
    if (a[key] instanceof Date) {
      const SECONDS_MARGIN = 2
      const difference = differenceInSeconds(a[key], b[key])
      if (Math.abs(difference) > SECONDS_MARGIN) {
        return false
      }
    } else if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}
