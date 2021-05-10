import Web3 from 'web3'
import { AbiItem, toBN } from 'web3-utils'
import parseEvent from '../common/parseEvent'
import IMetatransaction from '../common/IMetatransaction'
import ERC677Data from '../contracts/ERC677.json'
import CounterData from '../contracts/Counter.json'
import OneShotScheduleData from '../contracts/OneShotSchedule.json'
import { BLOCKCHAIN_HTTP_URL } from './constants'
import { deployContract } from './utils'

export interface ISetup {
  oneShotScheduleContractAddress: string;
  token: any;
  counter: any;
  accounts: { requestor: string, serviceProvider: string, payee: string, contractAdmin: string};
  plans: any[],
  web3: Web3;
  scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<IMetatransaction>;
}

export const setupContracts = async (): Promise<ISetup> => {
  const web3 = new Web3(BLOCKCHAIN_HTTP_URL)
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
  web3.eth.defaultAccount = accounts.contractAdmin

  const plans = [
    { price: toBN(15), window: toBN(10000) },
    { price: toBN(4), window: toBN(300) }
  ]

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
    web3,
    scheduleTransaction
  }
}
