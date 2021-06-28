import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { parseBlockchainTimestamp } from '../time'
import { IMetatransaction, ERIFSchedulerEvents } from '../entities'

/**
 * This module recovers all the events that happened since a certain block.
 * It is used to retrieve all events since the last time the service was stopped.
 */
export class Recoverer {
  private contract: RIFScheduler;
  private web3: Web3;

  constructor (rpcUrl: string, contractAddress: string) {
    this.web3 = new Web3(rpcUrl)

    this.contract = (new this.web3.eth.Contract(
      RIFSchedulerData.abi as AbiItem[],
      contractAddress
    ) as any) as RIFScheduler
  }

  async getCurrentBlockNumber () {
    return this.web3.eth.getBlockNumber()
  }

  async recoverScheduledTransactions (fromBlock: number, toBlock: number)
  : Promise<IMetatransaction[]> {
    const pastEvents = await this.contract.getPastEvents(
      ERIFSchedulerEvents.ExecutionRequested,
      { fromBlock, toBlock }
    )

    return pastEvents.map(event => ({
      blockNumber: event.blockNumber,
      id: event.returnValues.id,
      timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
    }))
  }
}
