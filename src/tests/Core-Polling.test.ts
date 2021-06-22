import { BLOCKCHAIN_HTTP_URL } from './constants'
import { PollingListener } from '../PollingListener'
import { runCoreWith } from './CoreRunner'

runCoreWith('PollingListener', PollingListener, BLOCKCHAIN_HTTP_URL)
