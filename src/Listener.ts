import { EventEmitter } from 'events'
import IMetatransaction from './common/IMetatransaction'
import parseBlockchainTimestamp from './common/parseBlockchainTimestamp'

export enum EListenerEvents {
  ProviderError = 'ProviderError',
  ExecutionRequestedError = 'ExecutionRequestedError',
  ExecutionRequested = 'ExecutionRequested'
}

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
interface IListener extends EventEmitter {
  listenNewExecutionRequests (
    startFromBlockNumber?: number
  ) : Promise<void>;
  disconnect (): Promise<void>

  on(
    event: EListenerEvents.ExecutionRequested,
    listener: (result: IMetatransaction) => void
  ): this;
  on(
    event: EListenerEvents.ExecutionRequestedError,
    listener: (error: Error) => void
  ): this;
  on(
    event: EListenerEvents.ProviderError,
    listener: () => void
  ): this;
}

export interface ExecutionRequestedEvent {
  blockNumber: number,
  returnValues: {
    [key: string]: any;
  }
}
export abstract class Listener extends EventEmitter implements IListener {
  abstract listenNewExecutionRequests (
    startFromBlockNumber?: number
  ) : Promise<void>;

  abstract disconnect (): Promise<void>

  protected emitExecutionsRequested (events: ExecutionRequestedEvent[]) {
    for (const event of events) {
      this.emit(EListenerEvents.ExecutionRequested, {
        blockNumber: event.blockNumber,
        id: event.returnValues.id,
        timestamp: parseBlockchainTimestamp(event.returnValues.timestamp)
      } as IMetatransaction)
    }
  }

  protected emitExecutionRequestedError (error: Error) {
    this.emit(EListenerEvents.ExecutionRequestedError, error)
  }

  protected emitProviderError () {
    this.emit(EListenerEvents.ProviderError)
  }
}
