import { Connection, createConnection } from 'typeorm'
import fs from 'fs'
import Entities from './entities'

export const createSqliteConnection = (database: string) =>
  createConnection({
    type: 'sqlite',
    database,
    entities: Entities,
    logging: false,
    dropSchema: true,
    synchronize: true
  })

export const resetDatabase = async (dbConnection: Connection) => {
  await dbConnection.dropDatabase()
  await dbConnection.synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) =>
  connection.close().then(() => {
    if (fs.existsSync(database)) fs.unlinkSync(database)
  })
