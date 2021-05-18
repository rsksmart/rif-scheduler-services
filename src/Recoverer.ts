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

  constructor (rpcUrl: string, contractAddress: string) {
    const web3 = new Web3(rpcUrl)

    this.contract = (new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    ) as any) as OneShotSchedule
  }

  async recoverScheduledTransactions (
    fromBlock: number = 0
  ): Promise<IMetatransaction[]> {
    // TODO: find a better way to get the event name, meanwhile, if the event change we has to change the string
    const eventName: ExecutionRequested | string = 'ExecutionRequested'

    const pastEvents = await this.contract.getPastEvents(
      eventName,
      {
        fromBlock,
        toBlock: 'latest'
      }
    )

    return pastEvents.map<IMetatransaction>((event) => ({
      blockNumber: event.blockNumber,
      id: event.returnValues.id,
      timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
    }))
  }
}
