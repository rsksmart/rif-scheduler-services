import { EventEmitter } from 'events'
import IMetatransaction from './common/IMetatransaction'

export enum EListenerEvents {
  ProviderError = 'ProviderError',
  ExecutionRequestedError = 'ExecutionRequestedError',
  ExecutionRequested = 'ExecutionRequested'
}

/**
 * This module listens to new events in the contract.
 * It is used to collect all the new schedulings.
 */
export interface IListener extends EventEmitter {
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
