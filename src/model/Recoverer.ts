import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import parseEvent from './parseEvent'

export class SchedulingsRecoverer {
  private web3: Web3;
  private oneShotScheduleContract: any;

  constructor (rpcUrl: string, transactionScheduleAddress: string) {
    this.web3 = new Web3(rpcUrl)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      transactionScheduleAddress
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
}
