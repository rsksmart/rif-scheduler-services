import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { IExecution, EExecutionState } from '../entities'
const toBN = Web3.utils.toBN

// HDWallet must be imported with require otherwise npm run build will fail
// Issue: https://github.com/trufflesuite/truffle/issues/2855
const HDWalletProvider = require('@truffle/hdwallet-provider')

type TxResult = {
  tx?: string
  error?: Error
  state: EExecutionState
}

export interface IExecutor {
  execute (transaction: IExecution): Promise<TxResult>
  stopEngine (): Promise<void>
  account (): Promise<string>
}

export class Executor implements IExecutor {
  private web3: Web3;
  private hdWalletProvider: any;
  private rifSchedulerContract: RIFScheduler;
  private confirmationsRequired: number;

  constructor (
    rpcUrl: string,
    contractAddress: string,
    confirmationsRequired: number,
    mnemonicPhrase: string
  ) {
    this.confirmationsRequired = confirmationsRequired

    this.hdWalletProvider = new HDWalletProvider({
      mnemonic: mnemonicPhrase,
      providerOrUrl: rpcUrl,
      numberOfAddresses: 1,
      shareNonce: true,
      derivationPath: "m/44'/137'/0'/0/"
    })

    this.web3 = new Web3(this.hdWalletProvider)

    this.rifSchedulerContract = (new this.web3.eth.Contract(
      RIFSchedulerData.abi as AbiItem[],
      contractAddress
    ) as any) as RIFScheduler
  }

  private async getCurrentState (id: string) : Promise<EExecutionState> {
    const currentState = await this.rifSchedulerContract.methods
      .getState(id).call()

    return currentState as EExecutionState
  }

  private async isNotConfirmed ({ blockNumber }: IExecution) {
    const currentBlockNumber = await this.web3.eth.getBlockNumber()

    const confirmations = currentBlockNumber - blockNumber

    return (confirmations < this.confirmationsRequired)
  }

  private async IsNotScheduled (transaction: IExecution) {
    const currentState = await this.getCurrentState(transaction.id)

    return (currentState !== EExecutionState.Scheduled)
  }

  account = () => this.web3.eth.getAccounts().then(accounts => accounts[0])

  getGasLimit = async () => {
    const account = await this.account()

    const balance = toBN(await this.web3.eth.getBalance(account))

    const gasPrice = toBN(await this.web3.eth.getGasPrice())

    const gasLimit = balance.div(gasPrice)

    const block = await this.web3.eth.getBlock('latest')

    const blockGasLimit = toBN(block.gasLimit)

    return gasLimit.gt(blockGasLimit) ? blockGasLimit : gasLimit
  }

  async execute (transaction: IExecution): Promise<TxResult> {
    let result: Partial<TxResult>

    try {
      const { id } = transaction

      if (await this.IsNotScheduled(transaction)) throw new Error('State must be Scheduled')
      if (await this.isNotConfirmed(transaction)) throw new Error('Minimum confirmations required')

      const providerAccountAddress = await this.account()

      const executeGas = await this.getGasLimit()

      const tx = await this.rifSchedulerContract.methods
        .execute(id)
        .send({ from: providerAccountAddress, gas: executeGas })
      result = { tx: tx.transactionHash }
    } catch (error) {
      result = { error }
    } finally {
      this.hdWalletProvider.engine.stop()
    }

    const state = await this.getCurrentState(transaction.id)
    return Object.assign({}, result, { state })
  }

  async stopEngine () {
    this.hdWalletProvider.engine.stop()
  }
}
