import Web3 from "web3";
import { AbiItem } from "web3-utils";
import OneShotScheduleData from "../contract/OneShotSchedule.json";

export interface IProvider {
  getPastMetatransactionAddedEvents(): Promise<void>;
  listenNewMetatransactionAddedEvent(
    callback: (eventValues: IMetatransactionAddedValues) => Promise<void>
  ): Promise<void>;
}

export interface IMetatransactionAddedValues {
  index: number;
  to: string;
  data: string;
  gas: number;
  timestamp: Date;
  value: string;
}

const ESTIMATED_BLOCKS_BY_DAY = 6500;

const BLOCKCHAIN_URL = "ws://127.0.0.1:8545"; // "https://public-node.testnet.rsk.co"

class Provider implements IProvider {
  private web3: Web3;
  private oneShotScheduleContract: any;

  constructor(address: string) {
    this.web3 = new Web3(BLOCKCHAIN_URL);

    this.oneShotScheduleContract = new this.web3.eth.Contract(
      OneShotScheduleData.abi as AbiItem[],
      address
    );
  }

  async getPastMetatransactionAddedEvents() {
    const currentBlockNumber = await this.web3.eth.getBlockNumber();

    const result = await this.oneShotScheduleContract.getPastEvents(
      "MetatransactionAdded",
      {
        fromBlock: currentBlockNumber - ESTIMATED_BLOCKS_BY_DAY * 2,
        toBlock: "latest",
      }
    );

    console.log("result", result);

    return result.map(({ returnValues }) => ({
      index: +returnValues.index,
      to: returnValues.to,
      data: returnValues.data,
      gas: +returnValues.gas,
      timestamp: new Date(+returnValues.timestamp * 1000),
      value: returnValues.value,
    }));
  }

  async listenNewMetatransactionAddedEvent(
    callback: (eventValues: IMetatransactionAddedValues) => Promise<void>
  ) {
    throw new Error("not implemented yet");
  }
}

export default Provider;
