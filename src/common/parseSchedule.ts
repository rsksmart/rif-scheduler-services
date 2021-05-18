import IMetatransaction from './IMetatransaction'

interface ISchedule {
  id: string,
  values: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
  },
  blockNumber: number
}

const KEYS = {
  requestor: '0',
  plan: '1',
  to: '2',
  data: '3',
  gas: '4',
  timestamp: '5',
  value: '6',
  state: '7'
}

const parseSchedule = ({ id, values, blockNumber }: ISchedule): IMetatransaction => {
  return {
    id,
    requestor: values[KEYS.requestor],
    plan: +values[KEYS.plan],
    to: values[KEYS.to],
    data: values[KEYS.data],
    gas: +values[KEYS.gas],
    timestamp: new Date(+values[KEYS.timestamp] * 1000),
    value: values[KEYS.value],
    blockNumber
  }
}

export default parseSchedule
