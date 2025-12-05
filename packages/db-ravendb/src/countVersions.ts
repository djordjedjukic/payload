import type { CountVersions } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const countVersions: CountVersions = async function countVersions(
  this: RavenDBAdapter,
  { collection: collectionSlug, locale, req, where = {} },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(`${collectionSlug}_versions`)

    const query = session.query({ collection: collectionName })

    const totalDocs = await query.count()

    if (shouldCloseSession) {
      session.dispose()
    }

    return {
      totalDocs,
    }
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

