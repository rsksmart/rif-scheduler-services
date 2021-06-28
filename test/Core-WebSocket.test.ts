import { BLOCKCHAIN_WS_URL } from './constants'
import { WebSocketListener } from '../src/model'
import { runCoreWith } from './CoreRunner'

runCoreWith('WebSocketListener', WebSocketListener, BLOCKCHAIN_WS_URL)
