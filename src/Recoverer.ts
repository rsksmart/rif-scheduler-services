import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contract/OneShotSchedule.json'
import IMetatransaction from './common/IMetatransaction'
import parseEvent from './common/parseEvent'

/**
 * This module recovers all the events that happened since a certain block.
 * It is used to retrieve all events since the last time the service was stopped.
 */
export class Recoverer {
  private contract: any;

  constructor (rpcUrl: string, contractAddress: string) {
    const web3 = new Web3(rpcUrl)

    this.contract = new web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      contractAddress
    )
  }

  async recoverScheduledTransactions (
    fromBlock: number = 0
  ): Promise<IMetatransaction[]> {
    const pastEvents = await this.contract.getPastEvents(
      'MetatransactionAdded',
      {
        fromBlock,
        toBlock: 'latest'
      }
    )

    return pastEvents.map(parseEvent)
  }
}
