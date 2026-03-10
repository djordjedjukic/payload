import type { BeginTransaction } from 'payload'

import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from '../types.js'

export const beginTransaction: BeginTransaction = function beginTransaction(this: RavenDBAdapter) {
  const session = this.store.openSession(this.database)
  const transactionID = uuid()
  this.sessions[transactionID] = {
    db: session,
    reject: () => {
      session.dispose()
      return Promise.resolve()
    },
    resolve: async () => {
      await session.saveChanges()
      session.dispose()
    },
  }

  return Promise.resolve(transactionID)
}
