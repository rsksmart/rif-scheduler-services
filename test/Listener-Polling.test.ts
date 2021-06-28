import { BLOCKCHAIN_HTTP_URL } from './constants'
import { PollingListener } from '../src/model'
import { runListenerWith } from './ListenerRunner'

runListenerWith('PollingListener', PollingListener, BLOCKCHAIN_HTTP_URL)
