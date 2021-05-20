const parseBlockchainTimestamp = (timestamp: string): Date => {
  return new Date(+timestamp * 1000)
}

export default parseBlockchainTimestamp
