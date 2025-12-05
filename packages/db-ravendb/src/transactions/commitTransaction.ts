import type { CommitTransaction } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export const commitTransaction: CommitTransaction = async function commitTransaction(
  this: RavenDBAdapter,
  id,
) {
  const transactionID = await Promise.resolve(id)
  const sessionWrapper = this.sessions[transactionID]

  if (!sessionWrapper) {
    throw new Error(`Transaction ${transactionID} not found`)
  }

  try {
    // call the resolve function to save changes
    await sessionWrapper.resolve()

    // remove from sessions
    delete this.sessions[transactionID]
  } catch (error) {
    // if commit fails, reject and clean up
    await sessionWrapper.reject()
    delete this.sessions[transactionID]
    throw error
  }
}

