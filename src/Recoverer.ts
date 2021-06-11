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

  async getCurrentBlockNumber () {
    return this.web3.eth.getBlockNumber()
  }

  async recoverScheduledTransactions (fromBlock: number, toBlock: number): Promise<IMetatransaction[]> {
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
}
