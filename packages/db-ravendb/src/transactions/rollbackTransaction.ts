import type { RollbackTransaction } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export const rollbackTransaction: RollbackTransaction = async function rollbackTransaction(
  this: RavenDBAdapter,
  id,
) {
  const transactionID = await Promise.resolve(id)
  const sessionWrapper = this.sessions[transactionID]

  if (!sessionWrapper) {
    throw new Error(`Transaction ${transactionID} not found`)
  }

  // call the reject function to dispose without saving
  await sessionWrapper.reject()

  // remove from sessions
  delete this.sessions[transactionID]
}

