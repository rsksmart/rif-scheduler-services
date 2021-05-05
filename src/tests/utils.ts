import { Connection } from 'typeorm'
import fs from 'fs'

export const resetDatabase = async (dbConnection: Connection) => {
  await dbConnection.dropDatabase()
  await dbConnection.synchronize()
}

export const deleteDatabase = (connection: Connection, database: string) =>
  connection.close().then(() => {
    if (fs.existsSync(database)) fs.unlinkSync(database)
  })
