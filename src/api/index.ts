import express from 'express'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import { Environment } from '../scripts'
import { Repository } from 'typeorm'
import { ScheduledExecution } from '../entities'
import getTransactionHashByExecutionId from './getTransactionHashByExecutionId'

const app = express()
app.use(morgan('dev'))
app.use(helmet())
app.use(cors())

const startApi = (environment: Environment, repository: Repository<ScheduledExecution>) => {
  app.get('/executions/:executionId', async (req, res) => {
    if (!req.params.executionId) {
      res.status(400).send('Missing executionId')
      return
    }

    try {
      const transactionHash = await getTransactionHashByExecutionId(repository, req.params.executionId)
      res.status(200).json({
        transactionHash
      })
    } catch (error) {
      console.error('api error', error)
      res.status(500).send('Unexpected error')
    }
  })

  app.listen(environment.API_PORT, () => {
    console.log(`Listening at http://localhost:${environment.API_PORT}`)
  })
}

export default startApi
