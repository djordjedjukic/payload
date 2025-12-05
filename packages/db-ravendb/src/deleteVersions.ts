import type { DeleteVersions } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const deleteVersions: DeleteVersions = async function deleteVersions(
  this: RavenDBAdapter,
  { collection: collectionSlug, locale, req, where },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(`${collectionSlug}_versions`)

    const query = session.query({ collection: collectionName })

    const docs = await query.all()

    docs.forEach(doc => {
      if (doc['@metadata'] && doc['@metadata']['@id']) {
        session.delete(doc['@metadata']['@id'])
      }
    })

    if (shouldCloseSession) {
      await session.saveChanges()
      session.dispose()
    }
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

