import { Connection } from 'typeorm'
import fs from 'fs'
import Web3 from 'web3'

export const resetDatabase = async (dbConnection: Connection) => {
  await dbConnection.dropDatabase()
  await dbConnection.synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) =>
  connection.close().then(() => {
    if (fs.existsSync(database)) fs.unlinkSync(database)
  })

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const getAccounts = async (web3: Web3) => {
  const [
    serviceProviderAccountAddress,
    payeeAccountAddress,
    requestorAccountAddress
  ] = await web3.eth.getAccounts()

  const accounts = {
    requestor: requestorAccountAddress,
    serviceProvider: serviceProviderAccountAddress,
    payee: payeeAccountAddress,
    contractAdmin: serviceProviderAccountAddress
  }

  return accounts
}
