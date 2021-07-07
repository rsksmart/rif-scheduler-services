export enum EExecutionState {
  Nonexistent = '0',
  Scheduled = '1',
  ExecutionSuccessful = '2',
  ExecutionFailed = '3',
  Overdue = '4',
  Refunded = '5',
  Cancelled = '6'
}

export interface IExecution {
  id: string;
  timestamp: Date;
  blockNumber: number;
}
