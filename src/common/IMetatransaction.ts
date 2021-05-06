export enum EMetatransactionStatus {
  scheduled = 'scheduled',
  executed = 'executed',
  failed = 'failed',
}
interface IMetatransaction {
  index: number;
  from: string;
  plan: number;
  to: string;
  data: string;
  gas: number;
  timestamp: Date;
  value: string;
  blockNumber: number;
}

export default IMetatransaction