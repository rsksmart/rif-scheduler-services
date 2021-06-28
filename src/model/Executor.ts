import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
// eslint-disable-next-line max-len
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { IMetatransaction, EMetatransactionState } from '../entities'

// HDWallet must be imported with require otherwise npm run build will fail
// Issue: https://github.com/trufflesuite/truffle/issues/2855
const HDWalletProvider = require('@truffle/hdwallet-provider')

export interface IExecutor {
  execute (transaction: IMetatransaction): Promise<void>
  getCurrentState (id: string): Promise<EMetatransactionState>
  stopEngine (): Promise<void>
  account (): Promise<string>
}

export class Executor implements IExecutor {
  private web3: Web3;
  private hdWalletProvider: any;
  private rifSchedulerContract: RIFScheduler;
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

    this.rifSchedulerContract = (new this.web3.eth.Contract(
      RIFSchedulerData.abi as AbiItem[],
      this.contractAddress
    ) as any) as RIFScheduler
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

  account = () => this.web3.eth.getAccounts().then(accounts => accounts[0])

  async execute (transaction: IMetatransaction) {
    try {
      const { id } = transaction

      await this.ensureConfirmations(transaction)
      await this.ensureIsScheduled(transaction)

      const providerAccountAddress = await this.account()

      const executeGas = await this.rifSchedulerContract.methods
        .execute(id)
        .estimateGas()

      await this.rifSchedulerContract.methods
        .execute(id)
        .send({ from: providerAccountAddress, gas: executeGas })
    } finally {
      this.hdWalletProvider.engine.stop()
    }
  }

  async getCurrentState (id: string) : Promise<EMetatransactionState> {
    const currentState = await this.rifSchedulerContract.methods
      .getState(id).call()

    return currentState as EMetatransactionState
  }

  async stopEngine () {
    this.hdWalletProvider.engine.stop()
  }
}
