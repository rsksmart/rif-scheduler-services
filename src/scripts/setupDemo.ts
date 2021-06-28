import Web3 from 'web3'
import { setupContracts } from '../tests/setupContracts'
import { sendBalanceToProviderAccount } from '../tests/sendBalanceToProviderAccount'
import { addMinutes, addSeconds } from 'date-fns'
import { BlockchainDate } from '../common/BlockchainDate'

export const setupDemo = async ({
  BLOCKCHAIN_HTTP_URL,
  TOKEN_ADDRESS,
  COUNTER_ADDRESS,
  RIF_SCHEDULER_ADDRESS,
  MNEMONIC_PHRASE
}) => {
  const web3 = new Web3(BLOCKCHAIN_HTTP_URL)
  const setup = await setupContracts(
    web3,
    TOKEN_ADDRESS,
    COUNTER_ADDRESS,
    RIF_SCHEDULER_ADDRESS
  )

  await sendBalanceToProviderAccount(web3, MNEMONIC_PHRASE, BLOCKCHAIN_HTTP_URL)

  // Schedule counter.inc() to be executed within 5 minutes.
  const currentDate = await new BlockchainDate(BLOCKCHAIN_HTTP_URL).now()
  const firstDate = addMinutes(currentDate, 5)
  for (let i = 0; i < 3; i++) {
    await setup.scheduleTransaction({ plan: 0, timestamp: addSeconds(firstDate, i) })
  }
}
