import Web3 from 'web3'

// HDWallet must be imported with require otherwise npm run build will fail
// Issue: https://github.com/trufflesuite/truffle/issues/2855
const HDWalletProvider = require('@truffle/hdwallet-provider')

export const sendBalanceToProviderAccount = async (
  web3: Web3,
  mnemonicPhrase: string,
  blockchainHttpUrl: string
) => {
  // send balance to provider account - needs refactor
  const providerWalletWeb3 = new HDWalletProvider({
    mnemonic: mnemonicPhrase,
    providerOrUrl: blockchainHttpUrl,
    numberOfAddresses: 1,
    shareNonce: true,
    derivationPath: "m/44'/137'/0'/0/"
  })
  const serviceProviderWeb3 = new Web3(providerWalletWeb3)
  const [serviceProviderAccount] = await serviceProviderWeb3.eth.getAccounts()
  await web3.eth.sendTransaction(
    { to: serviceProviderAccount, value: '1000000000000000000' }
  )
  providerWalletWeb3.engine.stop()
}
