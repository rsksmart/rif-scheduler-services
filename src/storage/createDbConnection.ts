import { createConnection } from 'typeorm'
import { ScheduledTransaction } from '../entities'

export const createDbConnection = (database: string) =>
  createConnection({
    type: 'sqlite',
    database,
    entities: [ScheduledTransaction],
    logging: false,
    dropSchema: false,
    synchronize: true,
    name: database
  })
