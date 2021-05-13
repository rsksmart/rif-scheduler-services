import Web3 from 'web3'
import { AbiItem, toBN } from 'web3-utils'
import parseEvent from '../common/parseEvent'
import IMetatransaction from '../common/IMetatransaction'
import ERC677Data from '../contracts/ERC677.json'
import CounterData from '../contracts/Counter.json'
import OneShotScheduleData from '../contracts/OneShotSchedule.json'
import { deployContract } from './utils'

export interface ISetup {
  oneShotScheduleContractAddress: string;
  token: any;
  counter: any;
  accounts: { requestor: string, serviceProvider: string, payee: string, contractAdmin: string};
  plans: any[],
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<IMetatransaction>;
}

export const deployAllContracts = async (
  web3: Web3
) => {
  const accounts = await getAccounts(web3)

  web3.eth.defaultAccount = accounts.contractAdmin

  const token = await deployContract(
    web3,
      ERC677Data.abi as AbiItem[],
      ERC677Data.bytecode,
      [accounts.contractAdmin, toBN('1000000000000000000000'), 'RIFOS', 'RIF']
  )

  const counter = await deployContract(
    web3,
      CounterData.abi as AbiItem[],
      CounterData.bytecode,
      []
  )

  const oneShotScheduleContract = await deployContract(
    web3,
      OneShotScheduleData.abi as AbiItem[],
      OneShotScheduleData.bytecode,
      [accounts.serviceProvider, accounts.payee]
  )

  return {
    tokenAddress: token.options.address,
    counterAddress: counter.options.address,
    oneShotScheduleAddress: oneShotScheduleContract.options.address
  }
}

export const getAccounts = async (web3: Web3) => {
  const [
    requestorAccountAddress,
    serviceProviderAccountAddress,
    payeeAccountAddress,
    contractAdminAccountAddress
  ] = await web3.eth.getAccounts()

  const accounts = {
    requestor: requestorAccountAddress,
    serviceProvider: serviceProviderAccountAddress,
    payee: payeeAccountAddress,
    contractAdmin: contractAdminAccountAddress
  }

  return accounts
}

export const setupContracts = async (
  web3: Web3,
  tokenAddress: string,
  counterAddress: string,
  oneShotScheduleAddress: string
): Promise<ISetup> => {
  const oneShotScheduleContract = new web3.eth.Contract(
    OneShotScheduleData.abi as AbiItem[],
    oneShotScheduleAddress
  )
  const token = new web3.eth.Contract(
    ERC677Data.abi as AbiItem[],
    tokenAddress
  )
  const counter = new web3.eth.Contract(
    CounterData.abi as AbiItem[],
    counterAddress
  )

  const accounts = await getAccounts(web3)

  web3.eth.defaultAccount = accounts.contractAdmin

  const plans = [
    { price: toBN(15), window: toBN(10000) },
    { price: toBN(4), window: toBN(300) }
  ]

  const tokenTransferGas = await token.methods
    .transfer(accounts.requestor, 100000)
    .estimateGas({ from: accounts.contractAdmin })
  await token.methods
    .transfer(accounts.requestor, 100000)
    .send({ from: accounts.contractAdmin, gas: tokenTransferGas })

  const addPlanGas = await oneShotScheduleContract.methods
    .addPlan(plans[0].price, plans[0].window, token.options.address)
    .estimateGas({ from: accounts.serviceProvider })
  await oneShotScheduleContract.methods
    .addPlan(plans[0].price, plans[0].window, token.options.address)
    .send({ from: accounts.serviceProvider, gas: addPlanGas })

  const scheduleTransaction = async (plan: number, data: any, value: any, timestamp: Date): Promise<IMetatransaction> => {
    const timestampContract = toBN(
      Math.floor(+timestamp / 1000)
    )

    const to = counter.options.address
    const gas = toBN(await counter.methods.inc().estimateGas())

    const approveGas = await token.methods
      .approve(oneShotScheduleContract.options.address, plans[plan].price)
      .estimateGas({ from: accounts.requestor })
    await token.methods
      .approve(oneShotScheduleContract.options.address, plans[plan].price)
      .send({ from: accounts.requestor, gas: approveGas })

    const purchaseGas = await oneShotScheduleContract.methods
      .purchase(plan, toBN(1))
      .estimateGas({ from: accounts.requestor })
    await oneShotScheduleContract.methods
      .purchase(plan, toBN(1))
      .send({ from: accounts.requestor, gas: purchaseGas })

    const scheduleGas = await oneShotScheduleContract.methods
      .schedule(plan, to, data, gas, timestampContract)
      .estimateGas({ from: accounts.requestor })
    const receipt = await oneShotScheduleContract.methods
      .schedule(plan, to, data, gas, timestampContract)
      .send({ from: accounts.requestor, value, gas: scheduleGas })

    return parseEvent(receipt.events.MetatransactionAdded)
  }

  return {
    oneShotScheduleContractAddress: oneShotScheduleContract.options.address,
    token,
    counter,
    accounts,
    plans,
    scheduleTransaction
  }
}
