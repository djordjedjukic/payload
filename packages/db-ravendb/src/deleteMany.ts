import type { DeleteMany } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'

export const deleteMany: DeleteMany = async function deleteMany(
  this: RavenDBAdapter,
  { collection: collectionSlug, req, where: _where },
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
    for (const doc of docs) {
      const id = doc?.['@metadata']?.['@id']

      if (typeof id === 'string') {
        await session.delete(id)
      }
    }

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
