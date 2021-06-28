import Web3 from 'web3'
import { parseBlockchainTimestamp } from './parseBlockchainTimestamp'

/**
 * This module gets the timestamp of the current block.
 */
export class BlockchainDate {
  private web3: Web3;

  constructor (rpcUrl: string) {
    this.web3 = new Web3(rpcUrl)
  }

  async now (): Promise<Date> {
    const blockNumber = await this.web3.eth.getBlockNumber()

    const { timestamp } = await this.web3.eth.getBlock(blockNumber)

    return parseBlockchainTimestamp(timestamp as string)
  }
}
