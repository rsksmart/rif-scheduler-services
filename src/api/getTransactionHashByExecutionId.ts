import { Repository } from 'typeorm'
import { EExecutionState, ScheduledExecution } from '../entities'

const getTransactionHashByExecutionId = async (
  repository: Repository<ScheduledExecution>,
  executionId: string): Promise<string | undefined> => {
  const result = await repository.findOne(executionId)
  if (result && result.state === EExecutionState.ExecutionSuccessful) {
    return result.reason
  }
}

export default getTransactionHashByExecutionId
