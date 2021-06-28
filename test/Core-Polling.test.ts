import { BLOCKCHAIN_HTTP_URL } from './constants'
import { PollingListener } from '../src/model'
import { runCoreWith } from './CoreRunner'

runCoreWith('PollingListener', PollingListener, BLOCKCHAIN_HTTP_URL)
