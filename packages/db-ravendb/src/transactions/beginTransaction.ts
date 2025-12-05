import type { BeginTransaction } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export const beginTransaction: BeginTransaction = async function beginTransaction(
  this: RavenDBAdapter,
) {
  // RavenDB uses sessions for transactions
  // create a new session and store it
  const session = this.store.openSession(this.database)

  // generate a transaction ID
  const transactionID = Date.now().toString()

  // store the session with resolve/reject functions
  this.sessions[transactionID] = {
    db: session,
    resolve: async () => {
      await session.saveChanges()
      session.dispose()
    },
    reject: async () => {
      session.dispose()
    },
  }

  return transactionID
}

