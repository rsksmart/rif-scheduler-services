import Web3 from 'web3'
import { ISetup } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { addMinutes } from 'date-fns'
import { getMethodSigIncData } from './utils'
const { toBN } = Web3.utils

export const setupDemo = async (web3: Web3, setup: ISetup, mnemonicPhrase: string, blockchainHttpUrl: string) => {
  await sendBalanceToProviderAccount(web3, mnemonicPhrase, blockchainHttpUrl)
  console.log('Sended balance to provider account')

  const executeAt = addMinutes(new Date(), 3)

  const incData = getMethodSigIncData(web3)

  await setup.scheduleTransaction(0, incData, toBN(0), executeAt)
  console.log('Transaction scheduled')
}
