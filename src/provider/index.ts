import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'

export interface IMetatransactionAddedValues {
  index: number;
  to: string;
  data: string;
  gas: number;
  timestamp: Date;
  value: string;
  blockNumber: number;
}

export interface IProvider {
  getPastScheduledTransactions(
    startFromBlock?: number
  ): Promise<IMetatransactionAddedValues[]>;
  listenNewScheduledTransactions(
    callback: (eventValues: IMetatransactionAddedValues) => Promise<void>
  ): Promise<void>;
}

const BLOCKCHAIN_URL = 'ws://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

class OneShotSchedule implements IProvider {
  private web3: Web3;
  private oneShotScheduleContract: any;
  private subscription: any;

  constructor (address: string) {
    this.web3 = new Web3(BLOCKCHAIN_URL)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      address
    )
  }

  async getPastScheduledTransactions (startFromBlock: number = 0) {
    const result = await this.oneShotScheduleContract.getPastEvents(
      'MetatransactionAdded',
      {
        fromBlock: startFromBlock,
        toBlock: 'latest'
      }
    )

    return result.map(({ returnValues, blockNumber }) => ({
      index: +returnValues.index,
      to: returnValues.to,
      data: returnValues.data,
      gas: +returnValues.gas,
      timestamp: new Date(+returnValues.timestamp * 1000),
      value: returnValues.value,
      blockNumber
    }))
  }

  async listenNewScheduledTransactions (
    callback: (eventValues: IMetatransactionAddedValues) => Promise<void>
  ) {
    this.subscription = this.oneShotScheduleContract.events
      .MetatransactionAdded({}, (error, { returnValues, blockNumber }) => {
        // console.log('event new', returnValues, blockNumber) // same results as the optional callback above
        if (error) {
          // TODO: what should we do?
          return
        }

        const result: IMetatransactionAddedValues = {
          index: +returnValues.index,
          to: returnValues.to,
          data: returnValues.data,
          gas: +returnValues.gas,
          timestamp: new Date(+returnValues.timestamp * 1000),
          value: returnValues.value,
          blockNumber
        }

        callback(result)
      })
  }
}

export default OneShotSchedule
