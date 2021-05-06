export enum EMetatransactionStatus {
  Scheduled = '0',
  ExecutionSuccessful = '1',
  ExecutionFailed = '2',
  Overdue = '3',
  Refunded = '4',
  Cancelled = '5'
}

interface IMetatransaction {
  id: string;
  requestor: string;
  plan: number;
  to: string;
  data: string;
  gas: number;
  timestamp: Date;
  value: string;
  blockNumber: number;
}

export default IMetatransaction
