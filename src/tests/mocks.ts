import IMetatransaction from '../common/IMetatransaction'
import { IExecutor } from '../Executor'
import { IScheduler } from '../Scheduler'

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
  }

  async stopEngine () {
  }
}
