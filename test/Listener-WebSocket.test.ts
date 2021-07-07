import { BLOCKCHAIN_WS_URL } from './constants'
import { WebSocketListener } from '../src/model'
import { runListenerWith } from './ListenerRunner'

runListenerWith('WebSocketListener', WebSocketListener, BLOCKCHAIN_WS_URL)
