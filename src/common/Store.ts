
import { LocalStorage } from 'node-localstorage'

class Store {
    private localStorage: LocalStorage

    constructor (directory: string = 'storage/values') {
      this.localStorage = new LocalStorage(directory)
    }

    getLastSyncedBlockNumber () {
      const value = this.localStorage.getItem('lastSyncedBlockNumber')

      return value ? parseInt(value) : undefined
    }

    setLastSyncedBlockNumber (value: number) {
      return this.localStorage.setItem('lastSyncedBlockNumber', value.toString())
    }

    clearAll () {
      this.localStorage.clear()
    }
}

export default Store
