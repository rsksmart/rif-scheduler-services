import Web3 from 'web3'
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import loggerFactory from '../loggerFactory'

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

const BLOCKCHAIN_URL = 'ws://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

class OneShotSchedule implements IProvider {
  private web3: Web3;
  private webSocketProvider: WebsocketProvider;
  private oneShotScheduleContract: any;
  private confirmationsRequired: number;

  constructor (address: string, confirmationsRequired: number) {
    this.confirmationsRequired = confirmationsRequired

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      BLOCKCHAIN_URL
    )

    this.web3 = new Web3(this.webSocketProvider)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      address
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

    return pastEvents.map(this.parseEvent)
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

        const newEvent = this.parseEvent(event)

        callback(newEvent)
      }
    )
  }

  async executeTransaction (transaction: IMetatransaction) {
    const { index, from, blockNumber } = transaction

    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    const confirmations = currentBlockNumber - blockNumber

    console.log('confirmations', currentBlockNumber, blockNumber, this.confirmationsRequired)

    if (confirmations < this.confirmationsRequired) {
      throw new Error('Minimum confirmations required')
    }

    const executeGas = await this.oneShotScheduleContract.methods
      .execute(index)
      .estimateGas()

    await this.oneShotScheduleContract.methods
      .execute(index)
      .send({ from, gas: executeGas })
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

  private parseEvent ({
    returnValues,
    blockNumber
  }): IMetatransaction {
    return {
      index: +returnValues.index,
      from: returnValues.from,
      plan: +returnValues.plan,
      to: returnValues.to,
      data: returnValues.data,
      gas: +returnValues.gas,
      timestamp: new Date(+returnValues.timestamp * 1000),
      value: returnValues.value,
      blockNumber
    }
  }
}

export default OneShotSchedule
