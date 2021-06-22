import {
  ExecutionRequested,
  Executed,
  ExecutionCancelled,
  ExecutionPurchased,
  PlanAdded,
  PlanRemoved
} from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'

export type TRIFSchedulerEvents =
    ExecutionRequested |
    ExecutionCancelled |
    ExecutionPurchased |
    Executed |
    PlanAdded |
    PlanRemoved

export enum ERIFSchedulerEvents {
  ExecutionRequested = 'ExecutionRequested',
  ExecutionCancelled = 'ExecutionCancelled',
  ExecutionPurchased = 'ExecutionPurchased',
  Executed = 'Executed',
  PlanAdded = 'PlanAdded',
  PlanRemoved = 'PlanRemoved'
}
