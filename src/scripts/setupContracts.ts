import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { parseBlockchainTimestamp } from '../time'
import { IExecution } from '../entities'
import ERC677Data from './contracts/ERC677.json'
import CounterData from './contracts/Counter.json'
import RIFSchedulerData from '@rsksmart/rif-scheduler-contracts/RIFScheduler.json'
import { RIFScheduler } from '@rsksmart/rif-scheduler-contracts/types/web3-v1-contracts/RIFScheduler'
import { deployContract } from './utils'

const toBN = Web3.utils.toBN
type BN = ReturnType<typeof toBN>

export interface IScheduleRequest {
  plan: number;
  timestamp: Date;
  executeAddress?: string;
  executeMethod?: string;
  executeGas?: BN;
  executeValue?: string | number | BN | undefined;
}

export interface ISetup {
  rifScheduler: RIFScheduler;
  token: any;
  counter: any;
  accounts: {
    requestor: string;
    serviceProvider: string;
    payee: string;
    contractAdmin: string;
  };
  plans: any[];
  scheduleTransaction: (
    scheduleRequest: IScheduleRequest
  ) => Promise<IExecution>;
  getExecutionParameters: (
    abi: AbiItem[],
    contractAddress: string,
    methodName: string,
    methodParams: string[]
  ) => Promise<{ executeMethod: string; executeGas: BN }>;
}

export const deployAllContracts = async (web3: Web3) => {
  const accounts = await getAccounts(web3)

  web3.eth.defaultAccount = accounts.contractAdmin

  const token = (await deployContract(
    web3,
    ERC677Data.abi as AbiItem[],
    ERC677Data.bytecode,
    [accounts.contractAdmin, toBN('1000000000000000000000'), 'RIFOS', 'RIF']
  )) as any

  const counter = (await deployContract(
    web3,
    CounterData.abi as AbiItem[],
    CounterData.bytecode,
    []
  )) as any

  const RIFScheduleContract = (await deployContract(
    web3,
    RIFSchedulerData.abi as AbiItem[],
    RIFSchedulerData.bytecode,
    [accounts.serviceProvider, accounts.payee, 15]
  )) as any as RIFScheduler

  return {
    tokenAddress: token.options.address,
    counterAddress: counter.options.address,
    rifSchedulerAddress: RIFScheduleContract.options.address
  }
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

export const setupContracts = async (
  web3: Web3,
  tokenAddress: string,
  counterAddress: string,
  rifSchedulerAddress: string
): Promise<ISetup> => {
  const rifScheduler = new web3.eth.Contract(
    RIFSchedulerData.abi as AbiItem[],
    rifSchedulerAddress
  ) as any as RIFScheduler
  const token = new web3.eth.Contract(
    ERC677Data.abi as AbiItem[],
    tokenAddress
  ) as any
  const counter = new web3.eth.Contract(
    CounterData.abi as AbiItem[],
    counterAddress
  ) as any

  const accounts = await getAccounts(web3)

  web3.eth.defaultAccount = accounts.contractAdmin

  const plans = [
    { price: 15, window: 10000, gasLimit: 10000000 },
    { price: 15, window: 10000, gasLimit: 10000 } // very low gasLimit
  ]

  const tokenTransferGas = await token.methods
    .transfer(accounts.requestor, 100000)
    .estimateGas({ from: accounts.contractAdmin })
  await token.methods
    .transfer(accounts.requestor, 100000)
    .send({ from: accounts.contractAdmin, gas: tokenTransferGas })

  for (const plan of plans) {
    const addPlanGas = await rifScheduler.methods
      .addPlan(plan.price, plan.window, plan.gasLimit, token.options.address)
      .estimateGas({ from: accounts.serviceProvider })

    await rifScheduler.methods
      .addPlan(plan.price, plan.window, plan.gasLimit, token.options.address)
      .send({ from: accounts.serviceProvider, gas: addPlanGas })
  }

  const getExecutionParameters = async (
    abi: AbiItem[],
    contractAddress: string,
    methodName: string,
    methodParams: string[]
  ): Promise<{ executeMethod: string; executeGas: BN }> => {
    const abiFunction = abi.find(
      (x) => x.type === 'function' && x.name === methodName
    )
    if (!abiFunction) {
      throw new Error('The name of the method specified does not exist.')
    }

    const executeMethod = web3.eth.abi.encodeFunctionCall(
      abiFunction,
      methodParams
    )

    const executeGas = toBN(
      await web3.eth.estimateGas({
        data: executeMethod,
        to: contractAddress
      })
    )

    return {
      executeMethod,
      executeGas
    }
  }

  const counterExecutionParameters = await getExecutionParameters(
    CounterData.abi as AbiItem[],
    counterAddress,
    'inc',
    []
  )

  const scheduleTransaction = async ({
    plan = 0,
    executeAddress = counterAddress,
    executeMethod = counterExecutionParameters.executeMethod,
    executeValue,
    timestamp
  }: IScheduleRequest): Promise<IExecution> => {
    const timestampContract = toBN(Math.floor(+timestamp / 1000))

    const approveGas = await token.methods
      .approve(rifScheduler.options.address, plans[plan].price)
      .estimateGas({ from: accounts.requestor })
    await token.methods
      .approve(rifScheduler.options.address, plans[plan].price)
      .send({ from: accounts.requestor, gas: approveGas })

    const purchaseGas = await rifScheduler.methods
      .purchase(plan, 1)
      .estimateGas({ from: accounts.requestor })
    await rifScheduler.methods
      .purchase(plan, 1)
      .send({ from: accounts.requestor, gas: purchaseGas })

    const scheduleGas = await rifScheduler.methods
      .schedule(
        plan,
        executeAddress,
        executeMethod,
        timestampContract
      )
      .estimateGas({ from: accounts.requestor })
    const receipt = await rifScheduler.methods
      .schedule(
        plan,
        executeAddress,
        executeMethod,
        timestampContract
      )
      .send({
        from: accounts.requestor,
        value: executeValue,
        gas: scheduleGas
      })

    return {
      blockNumber: receipt.events?.ExecutionRequested.blockNumber as number,
      id: receipt.events?.ExecutionRequested.returnValues.id,
      timestamp: parseBlockchainTimestamp(
        receipt.events?.ExecutionRequested.returnValues.timestamp
      )
    }
  }

  return {
    rifScheduler,
    token,
    counter,
    accounts,
    plans,
    scheduleTransaction,
    getExecutionParameters
  }
}
