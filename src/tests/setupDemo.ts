import Web3 from 'web3'
import { setupContracts } from './setupContracts'
import { sendBalanceToProviderAccount } from './sendBalanceToProviderAccount'
import { addMinutes } from 'date-fns'

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

  // Schedule counter.inc() to be executed within 3 minutes.
  await setup.scheduleTransaction({ plan: 0, timestamp: addMinutes(new Date(), 3) })
}
