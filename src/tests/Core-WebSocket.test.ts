import { BLOCKCHAIN_WS_URL } from './constants'
import { WebSocketListener } from '../WebSocketListener'
import { runCoreWith } from './CoreRunner'

runCoreWith('WebSocketListener', WebSocketListener, BLOCKCHAIN_WS_URL)
