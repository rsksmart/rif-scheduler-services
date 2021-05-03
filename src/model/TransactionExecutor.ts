import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import HDWalletProvider from '@truffle/hdwallet-provider'

export interface ITransactionExecutor {
  execute(transaction: IMetatransaction): Promise<void>;
}

class TransactionExecutor implements ITransactionExecutor {
  private web3: Web3;
  private hdWalletProvider: HDWalletProvider;
  private oneShotScheduleContract: any;
  private confirmationsRequired: number;
  private transactionScheduleAddress: string;
  private mnemonicPhrase: string;
  private blockchainUrl: string;

  constructor (
    transactionScheduleAddress: string,
    confirmationsRequired: number,
    mnemonicPhrase: string,
    blockchainUrl: string
  ) {
    this.transactionScheduleAddress = transactionScheduleAddress
    this.confirmationsRequired = confirmationsRequired
    this.mnemonicPhrase = mnemonicPhrase
    this.blockchainUrl = blockchainUrl

    this.hdWalletProvider = new HDWalletProvider({
      mnemonic: this.mnemonicPhrase,
      providerOrUrl: this.blockchainUrl,
      numberOfAddresses: 1,
      shareNonce: true,
      derivationPath: "m/44'/137'/0'/0/"
    })

    this.web3 = new Web3(this.hdWalletProvider)

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.transactionScheduleAddress
    )
  }

  private async ensureConfirmations ({ blockNumber }: IMetatransaction) {
    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    const confirmations = currentBlockNumber - blockNumber

    // console.log('confirmations', currentBlockNumber, blockNumber, this.confirmationsRequired)

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
          this.transactionScheduleAddress
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
}

export default TransactionExecutor
