import Web3 from 'web3'
<<<<<<< HEAD
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
<<<<<<< HEAD:src/provider/OneShotSchedule.ts
import loggerFactory from '../loggerFactory'
=======
import { differenceInSeconds } from 'date-fns'
import HDWalletProvider from '@truffle/hdwallet-provider'
>>>>>>> added tx executor with hdwallet:src/provider/TransactionExecutor.ts
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

<<<<<<< HEAD:src/provider/OneShotSchedule.ts
=======
import { WebsocketProvider } from 'web3-core/types/index'
import { AbiItem } from 'web3-utils'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import IMetatransaction from '../IMetatransaction'
import loggerFactory from '../loggerFactory'
import parseEvent from './parseEvent'

export interface IProvider {
  getPastScheduledTransactions(
    startFromBlock?: number
  ): Promise<IMetatransaction[]>;
  listenNewScheduledTransactions(
    callback: (eventValues: IMetatransaction) => Promise<void>
  ): Promise<void>;
  disconnect(): Promise<void>;
}

>>>>>>> added tx executor with hdwallet
// TODO: move this const to OneShotSchedule constructor
const BLOCKCHAIN_URL = 'ws://127.0.0.1:8545' // "https://public-node.testnet.rsk.co"

<<<<<<< HEAD
class OneShotSchedule implements IProvider {
<<<<<<< HEAD
=======
class TransactionExecutor implements ITransactionExecutor {
>>>>>>> added tx executor with hdwallet:src/provider/TransactionExecutor.ts
  private web3: Web3;
  private hdWalletProvider: HDWalletProvider;
  private oneShotScheduleContract: any;
<<<<<<< HEAD:src/provider/OneShotSchedule.ts
=======
=======
class OneShotSchedule implements IProvider { // FIXME: name proposal: TransactionsObserver
>>>>>>> tx collector
  private web3: Web3;
  private webSocketProvider: WebsocketProvider;
  private oneShotScheduleContract: any;
>>>>>>> added tx executor with hdwallet
  private transactionScheduleAddress: string;

  constructor (transactionScheduleAddress: string) {
    this.transactionScheduleAddress = transactionScheduleAddress
<<<<<<< HEAD
=======
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
>>>>>>> added tx executor with hdwallet:src/provider/TransactionExecutor.ts

    this.web3 = new Web3(this.hdWalletProvider)
=======

    this.webSocketProvider = new Web3.providers.WebsocketProvider(
      BLOCKCHAIN_URL
    )

    this.web3 = new Web3(this.webSocketProvider)
>>>>>>> added tx executor with hdwallet

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      this.transactionScheduleAddress
<<<<<<< HEAD
<<<<<<< HEAD:src/provider/OneShotSchedule.ts
=======
>>>>>>> added tx executor with hdwallet
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

  async listenNewScheduledTransactions (
    callback: (eventValues: IMetatransaction) => Promise<void>
  ) {
    this.oneShotScheduleContract.events.MetatransactionAdded(
      {},
      (error, event) => {
        if (error) {
          loggerFactory().error(
            'The websocket connection is not opened',
            error
          )
          return
        }

        const newEvent = parseEvent(event)

        callback(newEvent)
      }
    )
  }

  async disconnect (): Promise<void> {
    return new Promise((resolve) => {
      this.webSocketProvider.on('end', () => {
        // console.log('WS closed')
        resolve()
      })
      this.webSocketProvider.on('error', () => {
        loggerFactory().error('Failed while the websocket was disconnecting')
        resolve()
      })
      this.webSocketProvider.disconnect(0, 'close app')
    })
<<<<<<< HEAD
=======
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
>>>>>>> added tx executor with hdwallet:src/provider/TransactionExecutor.ts
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
=======
  }
}

export default OneShotSchedule
>>>>>>> added tx executor with hdwallet
