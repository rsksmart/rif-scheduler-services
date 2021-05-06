import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contracts/OneShotSchedule.json'
import IMetatransaction from './common/IMetatransaction'
import HDWalletProvider from '@truffle/hdwallet-provider'

export interface IExecutor {
  execute (transaction: IMetatransaction): Promise<void>
  stopEngine (): Promise<void>
}

export class Executor implements IExecutor {
  private web3: Web3;
  private hdWalletProvider: HDWalletProvider;
  private oneShotScheduleContract: any;
  private confirmationsRequired: number;
  private contractAddress: string;
  private mnemonicPhrase: string;
  private rpcUrl: string;

  constructor (
    rpcUrl: string,
    contractAddress: string,
    confirmationsRequired: number,
    mnemonicPhrase: string
  ) {
    this.contractAddress = contractAddress
    this.confirmationsRequired = confirmationsRequired
    this.mnemonicPhrase = mnemonicPhrase
    this.rpcUrl = rpcUrl

    this.hdWalletProvider = new HDWalletProvider({
      mnemonic: this.mnemonicPhrase,
      providerOrUrl: this.rpcUrl,
      numberOfAddresses: 1,
      shareNonce: true,
      derivationPath: "m/44'/137'/0'/0/"
    })

    this.web3 = new Web3(this.hdWalletProvider)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.contractAddress
    )
  }

  private async ensureConfirmations ({ blockNumber }: IMetatransaction) {
    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    const confirmations = currentBlockNumber - blockNumber

    if (confirmations < this.confirmationsRequired) {
      throw new Error('Minimum confirmations required')
    }
  }

  private async ensureNotExecuted (transaction: IMetatransaction) {
    // TODO: once we have a getState method, change this call to use it

    const contractTransaction = await this.oneShotScheduleContract.methods
      .getSchedule(transaction.index).call()

    const isExecutedKey = '7'

    if (contractTransaction[isExecutedKey]) {
      throw new Error('Already executed')
    }
  }

  async execute (transaction: IMetatransaction) {
    try {
      const { index } = transaction

      await this.ensureConfirmations(transaction)
      await this.ensureNotExecuted(transaction)

      const transactionSchedule = new this.web3.eth.Contract(
          OneShotScheduleData.abi as AbiItem[],
          this.contractAddress
      )

      const [providerAccountAddress] = await this.web3.eth.getAccounts()

      const executeGas = await transactionSchedule.methods
        .execute(index)
        .estimateGas()

      await transactionSchedule.methods
        .execute(index)
        .send({ from: providerAccountAddress, gas: executeGas })
    } finally {
      this.hdWalletProvider.engine.stop()
    }
  }

  async stopEngine () {
    this.hdWalletProvider.engine.stop()
  }
}
