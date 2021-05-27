import { createConnection } from 'typeorm'
import Entities from './entities'

export const createDbConnection = (database: string) =>
  createConnection({
    type: 'sqlite',
    database,
    entities: Entities,
    logging: false,
    dropSchema: false,
    synchronize: true,
    name: database
  })
