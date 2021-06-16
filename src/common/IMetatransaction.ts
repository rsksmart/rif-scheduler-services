export enum EMetatransactionState {
  Nonexistent = '0',
  Scheduled = '1',
  ExecutionSuccessful = '2',
  ExecutionFailed = '3',
  Overdue = '4',
  Refunded = '5',
  Cancelled = '6'
}

interface IMetatransaction {
  id: string;
  timestamp: Date;
  blockNumber: number;
}

export default IMetatransaction
