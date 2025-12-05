import type { IDocumentSession } from 'ravendb'
import type { PayloadRequest } from 'payload'

import type { RavenDBAdapter } from '../types.js'

export async function getSession(
  adapter: RavenDBAdapter,
  req?: Partial<PayloadRequest>,
): Promise<IDocumentSession | undefined> {
  if (!req) {
    return undefined
  }

  const transactionID = await Promise.resolve(req.transactionID)

  if (transactionID !== null && transactionID !== undefined) {
    const sessionWrapper = adapter.sessions[transactionID]
    return sessionWrapper?.db
  }

  return undefined
}

