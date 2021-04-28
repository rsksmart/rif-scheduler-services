import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import { differenceInSeconds } from 'date-fns'
import HDWalletProvider from '@truffle/hdwallet-provider'
import parseEvent from './parseEvent'

export interface ITransactionExecutor {
  execute(transaction: IMetatransaction): Promise<void>;
}

export class TxMinimumConfirmationsRequiredError extends Error {
  constructor (confirmationsRequired: number, currentConfirmations: number) {
    super(`Requires ${confirmationsRequired} confirmations but has ${currentConfirmations}`)

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxMinimumConfirmationsRequiredError.prototype)
  }
}

export class TxAlreadyExecutedError extends Error {
  constructor () {
    super('Already executed')

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxAlreadyExecutedError.prototype)
  }
}

export class TxInvalidError extends Error {
  constructor () {
    super('Invalid metatransaction')

    // Set the prototype explicitly. (required by typescript)
    Object.setPrototypeOf(this, TxInvalidError.prototype)
  }
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
      throw new TxMinimumConfirmationsRequiredError(this.confirmationsRequired, confirmations)
    }
  }

  private async ensureIsStillValid (transaction: IMetatransaction) {
    const contractTransaction = await this.oneShotScheduleContract.methods
      .getSchedule(transaction.index).call()

    const txKeys = {
      from: '0',
      plan: '1',
      to: '2',
      data: '3',
      gas: '4',
      timestamp: '5',
      value: '6',
      executed: '7'
    }

    if (contractTransaction[txKeys.executed]) {
      throw new TxAlreadyExecutedError()
    }

    const currentTransaction = parseEvent({
      returnValues: {
        data: contractTransaction[txKeys.data],
        from: contractTransaction[txKeys.from],
        gas: contractTransaction[txKeys.gas],
        index: transaction.index, // not available in the contract response
        plan: contractTransaction[txKeys.plan],
        timestamp: contractTransaction[txKeys.timestamp],
        to: contractTransaction[txKeys.to],
        value: contractTransaction[txKeys.value]
      },
      blockNumber: transaction.blockNumber // not available in the contract response
    })

    if (!shallowEqual(transaction, currentTransaction)) {
      throw new TxInvalidError()
    }
  }

  async execute (transaction: IMetatransaction) {
    const { index } = transaction

    await this.ensureConfirmations(transaction)
    await this.ensureIsStillValid(transaction)

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

    this.hdWalletProvider.engine.stop()
  }
}

export default TransactionExecutor

function shallowEqual (a: IMetatransaction, b: IMetatransaction) {
  for (const key in a) {
    if (a[key] instanceof Date) {
      const SECONDS_MARGIN = 2
      const difference = differenceInSeconds(a[key], b[key])
      if (Math.abs(difference) > SECONDS_MARGIN) {
        return false
      }
    } else if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}
