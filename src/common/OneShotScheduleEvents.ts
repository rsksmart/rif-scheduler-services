import {
  ExecutionRequested,
  Executed,
  ExecutionCancelled,
  ExecutionPurchased,
  PlanAdded,
  PlanRemoved
} from '../contracts/types/OneShotSchedule'

export type TOneShotScheduleEvents =
    ExecutionRequested |
    ExecutionCancelled |
    ExecutionPurchased |
    Executed |
    PlanAdded |
    PlanRemoved

export enum EOneShotScheduleEvents {
  ExecutionRequested = 'ExecutionRequested',
  ExecutionCancelled = 'ExecutionCancelled',
  ExecutionPurchased = 'ExecutionPurchased',
  Executed = 'Executed',
  PlanAdded = 'PlanAdded',
  PlanRemoved = 'PlanRemoved'
}
