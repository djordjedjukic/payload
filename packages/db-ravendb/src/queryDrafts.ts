import type { QueryDrafts } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const queryDrafts: QueryDrafts = async function queryDrafts(
  this: RavenDBAdapter,
  { collection: collectionSlug, locale, req, where = {} },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    // query for drafts
    const query = session.query({ collection: collectionName })
      .whereEquals('_status', 'draft')

    const docs = await query.all()

    if (shouldCloseSession) {
      session.dispose()
    }

    return docs as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

