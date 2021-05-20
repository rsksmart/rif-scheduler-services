export enum EMetatransactionState {
  Scheduled = '0',
  ExecutionSuccessful = '1',
  ExecutionFailed = '2',
  Overdue = '3',
  Refunded = '4',
  Cancelled = '5'
}

interface IMetatransaction {
  id: string;
  timestamp: Date;
  blockNumber: number;
}

export default IMetatransaction
