import type { CommitTransaction } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export const commitTransaction: CommitTransaction = async function commitTransaction(
  this: RavenDBAdapter,
  id,
) {
  const transactionID = await Promise.resolve(id)
  const sessionWrapper = this.sessions[transactionID]

  if (!sessionWrapper) {
    return
  }

  try {
    await sessionWrapper.resolve()
  } catch (error) {
    await sessionWrapper.reject()
    throw error
  } finally {
    delete this.sessions[transactionID]
  }
}
