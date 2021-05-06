import Web3 from 'web3'
import { AbiItem, toBN } from 'web3-utils'
import parseEvent from '../common/parseEvent'
import IMetatransaction from '../common/IMetatransaction'
import ERC677Data from '../contract/ERC677.json'
import CounterData from '../contract/Counter.json'
import OneShotScheduleData from '../contract/OneShotSchedule.json'
import { BLOCKCHAIN_HTTP_URL } from './constants'
import { deployContract } from './utils'

export interface ISetup {
    oneShotScheduleContractAddress: string;
    token: any;
    counter: any;
    txOptions: { from: string };
    plans: any[],
    web3: Web3;
    scheduleTransaction: (plan: number, data: any, value: any, timestamp: Date) => Promise<IMetatransaction>;
  }

export const setupContracts = async (): Promise<ISetup> => {
  const web3 = new Web3(BLOCKCHAIN_HTTP_URL)
  const [from] = await web3.eth.getAccounts()

  const txOptions = { from }
  web3.eth.defaultAccount = from

  const plans = [
    { price: toBN(15), window: toBN(10000) },
    { price: toBN(4), window: toBN(300) }
  ]

  const token = await deployContract(
    web3,
      ERC677Data.abi as AbiItem[],
      ERC677Data.bytecode,
      [from, toBN('1000000000000000000000'), 'RIFOS', 'RIF']
  )

  // console.log('balance',
  //   await token.methods.balanceOf(from).call()
  // )

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
      [token.options.address, from]
  )

  const addPlanGas = await oneShotScheduleContract.methods
    .addPlan(plans[0].price, plans[0].window)
    .estimateGas()
  await oneShotScheduleContract.methods
    .addPlan(plans[0].price, plans[0].window)
    .send({ ...txOptions, gas: addPlanGas })

  const scheduleTransaction = async (
    plan: number,
    data: any,
    value: any,
    timestamp: Date
  ): Promise<IMetatransaction> => {
    const timestampContract = toBN(
      Math.floor(+timestamp / 1000)
    )

    const to = counter.options.address
    const gas = toBN(await counter.methods.inc().estimateGas())

    const approveGas = await token.methods
      .approve(oneShotScheduleContract.options.address, plans[plan].price)
      .estimateGas()
    await token.methods
      .approve(oneShotScheduleContract.options.address, plans[plan].price)
      .send({ ...txOptions, gas: approveGas })

    const purchaseGas = await oneShotScheduleContract.methods
      .purchase(plan, toBN(1))
      .estimateGas()
    await oneShotScheduleContract.methods
      .purchase(plan, toBN(1))
      .send({ ...txOptions, gas: purchaseGas })

    const scheduleGas = await oneShotScheduleContract.methods
      .schedule(plan, to, data, gas, timestampContract)
      .estimateGas()
    const receipt = await oneShotScheduleContract.methods
      .schedule(plan, to, data, gas, timestampContract)
      .send({ ...txOptions, value, gas: scheduleGas })

    return parseEvent(receipt.events.MetatransactionAdded)
  }

  return {
    oneShotScheduleContractAddress: oneShotScheduleContract.options.address,
    token,
    counter,
    txOptions,
    plans,
    web3,
    scheduleTransaction
  }
}
