import type { DeleteMany } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'
import { buildQuery } from './queries/buildQuery.js'

export const deleteMany: DeleteMany = async function deleteMany(
  this: RavenDBAdapter,
  { collection: collectionSlug, req, where },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    // build query to find documents to delete
    const query = session.query({ collection: collectionName })

    // TODO: apply where conditions properly
    const docs = await query.all()

    // delete all matching documents
    docs.forEach(doc => {
      if (doc['@metadata'] && doc['@metadata']['@id']) {
        session.delete(doc['@metadata']['@id'])
      }
    })

    if (shouldCloseSession) {
      await session.saveChanges()
      session.dispose()
    }

    // deleteMany returns void
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

