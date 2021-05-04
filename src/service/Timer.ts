import cron from 'node-cron'
import { Collector } from '../model/Collector'

const EVERY_FIVE_MINUTES = '*/5 * * * *'

export interface ITimer {
  start (collector: Collector): Promise<void>
  stop (): Promise<void>
}

class Timer implements ITimer {
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

export default Timer
