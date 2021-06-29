import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'

export const deployContract = async (
  web3: Web3,
  abi: AbiItem[],
  bytecode: string,
  args?: any[]
): Promise<Contract> => {
  const contract = new web3.eth.Contract(abi)
  const deployer = contract.deploy({ data: bytecode, arguments: args })

  const from = web3.eth.defaultAccount as string

  const gas = await deployer.estimateGas({ from })

  return new Promise((resolve, reject) =>
    deployer
      .send({ from, gas })
      .on('error', (error: Error) => reject(error))
      .then((newContractInstance: Contract) => resolve(newContractInstance))
  )
}
