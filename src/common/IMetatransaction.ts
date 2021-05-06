export enum EMetatransactionStatus {
  scheduled = 'scheduled',
  executed = 'executed',
  failed = 'failed',
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
