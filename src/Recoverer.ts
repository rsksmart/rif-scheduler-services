import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contracts/OneShotSchedule.json'
import { OneShotSchedule, ExecutionRequested } from './contracts/types/OneShotSchedule'
import IMetatransaction from './common/IMetatransaction'
import parseBlockchainTimestamp from './common/parseBlockchainTimestamp'

/**
 * This module recovers all the events that happened since a certain block.
 * It is used to retrieve all events since the last time the service was stopped.
 */
export class Recoverer {
  private contract: OneShotSchedule;
  private web3: Web3;

  constructor (rpcUrl: string, contractAddress: string, private startFromBlockNumber: number, private blocksChunkSize: number) {
    this.web3 = new Web3(rpcUrl)

    this.contract = (new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    ) as any) as OneShotSchedule
  }

  async recoverScheduledTransactionsByChunks (fromBlock: number, toBlock: number): Promise<IMetatransaction[]> {
    // TODO: find a better way to get the event name, meanwhile, if the event change we has to change the string
    const eventName: ExecutionRequested | string = 'ExecutionRequested'

    const pastEvents = await this.contract.getPastEvents(
      eventName,
      {
        fromBlock,
        toBlock: toBlock - 1
      }
    )

    return pastEvents.map(event => ({
      blockNumber: event.blockNumber,
      id: event.returnValues.id,
      timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
    }))
  }

  async recoverScheduledTransactions (
    lastBlockNumber?: number,
    onProgress?: (index: number, current: number) => void
  ): Promise<IMetatransaction[]> {
    const lastBlockNumberOrDefault = lastBlockNumber || this.startFromBlockNumber

    // TODO: find a better way to get the event name, meanwhile, if the event change we has to change the string
    const eventName: ExecutionRequested | string = 'ExecutionRequested'

    let currentBlockNumber = await this.web3.eth.getBlockNumber()

    const accumulator: IMetatransaction[] = []

    for (let index = lastBlockNumberOrDefault; index < currentBlockNumber; index += this.blocksChunkSize) {
      if (onProgress) {
        onProgress(index, currentBlockNumber)
      }

      const pastEvents = await this.contract.getPastEvents(
        eventName,
        {
          fromBlock: index,
          toBlock: index + this.blocksChunkSize - 1
        }
      )

      pastEvents.forEach(event => {
        accumulator.push({
          blockNumber: event.blockNumber,
          id: event.returnValues.id,
          timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
        })
      })

      currentBlockNumber = await this.web3.eth.getBlockNumber()
    }

    return accumulator
  }
}
