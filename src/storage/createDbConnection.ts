import { createConnection } from 'typeorm'
import { ScheduledExecution } from '../entities'

export const createDbConnection = (database: string) =>
  createConnection({
    type: 'sqlite',
    database,
    entities: [ScheduledExecution],
    logging: false,
    dropSchema: false,
    synchronize: true,
    name: database
  })
