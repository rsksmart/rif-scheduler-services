import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { Listener } from './ListenerBase'
import { ERIFSchedulerEvents } from '../../entities'

const DEFAULT_POLLING_INTERVAL = 60000

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export class PollingListener extends Listener {
  private contract: RIFScheduler
  private web3: Web3
  private intervalId?: any
  private lastBlockNumber = 0
  public pollingInterval = DEFAULT_POLLING_INTERVAL

  constructor (rpcUrl: string, contractAddress: string) {
    super()

    this.web3 = new Web3(rpcUrl)

    this.contract = (new this.web3.eth.Contract(
      RIFSchedulerData.abi as AbiItem[],
      contractAddress
    ) as any) as RIFScheduler
  }

  async listenNewExecutionRequests (
    startFromBlockNumber?: number
  ) : Promise<void> {
    this.lastBlockNumber = startFromBlockNumber || await this.web3.eth.getBlockNumber()

    this.intervalId = setInterval(async () => {
      try {
        const currentIntervalBlockNumber = await this.web3.eth.getBlockNumber()

        const pastEvents = await this.contract.getPastEvents(
          ERIFSchedulerEvents.ExecutionRequested,
          {
            fromBlock: this.lastBlockNumber,
            toBlock: currentIntervalBlockNumber
          }
        )

        this.emitExecutionsRequested(pastEvents)

        this.lastBlockNumber = currentIntervalBlockNumber
      } catch (error) {
        this.emitExecutionRequestedError(error)
      }
    }, this.pollingInterval)
  }

  async disconnect (): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
