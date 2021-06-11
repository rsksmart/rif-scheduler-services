import store from 'store2'
import { LocalStorage } from 'node-localstorage'

const storeConfigured = store.area('fs', new LocalStorage('./store-values'))

export default storeConfigured
