import IMetatransaction from './IMetatransaction'

const parseEvent = ({
  returnValues,
  blockNumber
}): IMetatransaction => {
  return {
    index: +returnValues.index,
    from: returnValues.from,
    plan: +returnValues.plan,
    to: returnValues.to,
    data: returnValues.data,
    gas: +returnValues.gas,
    timestamp: new Date(+returnValues.timestamp * 1000),
    value: returnValues.value,
    blockNumber
  }
}

export default parseEvent
