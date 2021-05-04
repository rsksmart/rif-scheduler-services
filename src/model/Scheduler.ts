import cron from 'node-cron'
import { Collector } from './Collector'

const EVERY_FIVE_MINUTES = '*/5 * * * *'

export interface IScheduler {
  start (collector: Collector): Promise<void>
  stop (): Promise<void>
}

export class Scheduler implements IScheduler {
  private cronExpression: string;
  private scheduledTask: cron.ScheduledTask | undefined;

  constructor (
    cronExpression: string = EVERY_FIVE_MINUTES
  ) {
    this.cronExpression = cronExpression
  }

  async start (collector: Collector) {
    this.scheduledTask = cron.schedule(this.cronExpression, () => collector.collectAndExecute())
  }

  async stop () {
    if (this.scheduledTask) {
      this.scheduledTask.stop()
    }
  }
}
