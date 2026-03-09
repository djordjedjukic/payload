import type { BeginTransaction } from 'payload'

import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from '../types.js'

export const beginTransaction: BeginTransaction = function beginTransaction(this: RavenDBAdapter) {
  // RavenDB uses sessions for transactions
  // create a new session and store it
  const session = this.store.openSession(this.database)

  // generate a transaction ID
  const transactionID = uuid()

  // store the session with resolve/reject functions
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
