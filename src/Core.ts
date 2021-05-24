import { Cache } from './Cache'
import loggerFactory from './common/loggerFactory'
import { Recoverer } from './Recoverer'
import { Listener, newScheduledTransactionsError, webSocketProviderError } from './Listener'
import { Collector } from './Collector'
import { Tracer } from 'tracer'
import { IScheduler } from './Scheduler'
import { IExecutor } from './Executor'

class Core {
  private cache: Cache;
  private recoverer: Recoverer
  private listener: Listener
  private collector: Collector
  private executor: IExecutor
  private scheduler: IScheduler
  private logger: Tracer.Logger

  constructor (
    recoverer: Recoverer,
    listener: Listener,
    cache: Cache,
    collector: Collector,
    executor: IExecutor,
    scheduler: IScheduler
  ) {
    this.cache = cache
    this.recoverer = recoverer
    this.listener = listener

    this.collector = collector
    this.executor = executor
    this.scheduler = scheduler

    this.logger = loggerFactory()
  }

  async start () {
    this.logger.debug('Starting...')

    this.executor.account().then(account => this.logger.debug(`Account: ${account}`))

    this.logger.debug('Sync missed/older events')
    const lastBlockNumber = await this.cache.getLastSyncedBlockNumber()

    const pastEvents = await this.recoverer.recoverScheduledTransactions(
      lastBlockNumber
    )

    for (const event of pastEvents) {
      this.logger.info('Recovering past event', event)
      await this.cache.save(event)
    }

    this.listener.on(newScheduledTransactionsError, this.logger.error)
    this.listener.on(webSocketProviderError, this.logger.error)

    this.logger.debug('Start listening new events')
    await this.listener.listenNewScheduledTransactions(async (event) => {
      this.logger.info('New scheduled execution', event)
      await this.cache.save(event)
    })

    this.logger.debug('Start scheduler')
    await this.scheduler.start(async () => {
      const collectedTx = await this.collector.collectSince(new Date(Date.now()))

      for (const transaction of collectedTx) {
        this.logger.info('Executing: ', transaction)

        const error = await this.executor
          .execute(transaction)
          .catch(error => error)

        const resultState = await this.executor.getCurrentState(transaction.id)
        await this.cache.changeState(transaction.id, resultState, error?.message)

        if (error) {
          this.logger.error(error)
        }
      }
    })
  }

  async stop () {
    this.logger.debug('Stopped')

    await this.listener.disconnect()
    await this.executor.stopEngine()
    await this.scheduler.stop()
  }
}

export default Core
