import { IMetatransaction, EMetatransactionState } from '../src/entities'
import { IExecutor, IScheduler } from '../src/model'

export class SchedulerMock implements IScheduler {
  async start (task: () => Promise<void>) {
    await task()
  }

  async stop () {
  }
}

export class ExecutorMock implements IExecutor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute (transaction: IMetatransaction) {
    // do nothing
    return { tx: '0xMOCKED_TX', state: EMetatransactionState.ExecutionSuccessful }
  }

  async stopEngine () {
  }

  async account () {
    return Promise.resolve('0xmock')
  }
}
