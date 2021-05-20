import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from './contracts/OneShotSchedule.json'
import { OneShotSchedule } from './contracts/types/OneShotSchedule'
import IMetatransaction, { EMetatransactionState } from './common/IMetatransaction'

// HDWallet must be imported with require otherwise npm run build will fail
// Issue: https://github.com/trufflesuite/truffle/issues/2855
const HDWalletProvider = require('@truffle/hdwallet-provider')

export interface IExecutor {
  execute (transaction: IMetatransaction): Promise<void>
  getCurrentState (id: string): Promise<EMetatransactionState>
  stopEngine (): Promise<void>
}

export class Executor implements IExecutor {
  private web3: Web3;
  private hdWalletProvider: any;
  private oneShotScheduleContract: OneShotSchedule;
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

    this.oneShotScheduleContract = (new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.contractAddress
    ) as any) as OneShotSchedule
  }

  private async ensureConfirmations ({ blockNumber }: IMetatransaction) {
    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    const confirmations = currentBlockNumber - blockNumber

    if (confirmations < this.confirmationsRequired) {
      throw new Error('Minimum confirmations required')
    }
  }

  private async ensureIsScheduled (transaction: IMetatransaction) {
    const currentState = await this.getCurrentState(transaction.id)

    if (currentState !== EMetatransactionState.Scheduled) {
      throw new Error('State must be Scheduled')
    }
  }

  async execute (transaction: IMetatransaction) {
    try {
      const { id: index } = transaction

      await this.ensureConfirmations(transaction)
      await this.ensureIsScheduled(transaction)

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

  async getCurrentState (id: string) : Promise<EMetatransactionState> {
    const currentState = await this.oneShotScheduleContract.methods
      .getState(id).call()

    return currentState as EMetatransactionState
  }

  async stopEngine () {
    this.hdWalletProvider.engine.stop()
  }
}
