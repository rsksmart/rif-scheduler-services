import Web3 from 'web3'
import { setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { addMinutes } from 'date-fns'
import { getMethodSigIncData } from './utils'
const { toBN } = Web3.utils

export const setupDemo = async ({
  BLOCKCHAIN_HTTP_URL,
  TOKEN_ADDRESS,
  COUNTER_ADDRESS,
  ONE_SHOOT_SCHEDULER_ADDRESS,
  MNEMONIC_PHRASE
}) => {
  const web3 = new Web3(BLOCKCHAIN_HTTP_URL)
  const setup = await setupContracts(
    web3,
    TOKEN_ADDRESS,
    COUNTER_ADDRESS,
    ONE_SHOOT_SCHEDULER_ADDRESS
  )

  await sendBalanceToProviderAccount(web3, MNEMONIC_PHRASE, BLOCKCHAIN_HTTP_URL)

  const executeAt = addMinutes(new Date(), 3)

  const incData = getMethodSigIncData(web3)

  await setup.scheduleTransaction(0, incData, toBN(0), executeAt)
}
