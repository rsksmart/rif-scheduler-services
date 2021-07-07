import cron from 'node-cron'

const EVERY_FIVE_MINUTES = '*/5 * * * *'
export interface IScheduler {
  start (task: () => Promise<void>): Promise<void>
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

  async start (task: () => Promise<void>): Promise<void> {
    this.scheduledTask = cron.schedule(this.cronExpression, task)
  }

  async stop () {
    if (!this.scheduledTask) {
      throw new Error('Task not started')
    }

    this.scheduledTask.stop()
  }
}
