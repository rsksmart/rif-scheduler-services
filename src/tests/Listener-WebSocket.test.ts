import { BLOCKCHAIN_WS_URL } from './constants'
import { WebSocketListener } from '../WebSocketListener'
import { runListenerWith } from './ListenerRunner'

runListenerWith('WebSocketListener', WebSocketListener, BLOCKCHAIN_WS_URL)
