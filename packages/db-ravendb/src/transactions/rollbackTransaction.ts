import type { RollbackTransaction } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export const rollbackTransaction: RollbackTransaction = async function rollbackTransaction(
  this: RavenDBAdapter,
  id,
) {
  const transactionID = await Promise.resolve(id)
  const sessionWrapper = this.sessions[transactionID]

  if (!sessionWrapper) {
    return
  }

  try {
    await sessionWrapper.reject()
  } finally {
    delete this.sessions[transactionID]
  }
}
