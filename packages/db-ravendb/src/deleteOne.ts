import type { DeleteOne } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const deleteOne: DeleteOne = async function deleteOne(
  this: RavenDBAdapter,
  { collection: collectionSlug, req, where: whereArg = {} },
) {
  const where = whereArg

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    let docId: string | null = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      docId = `${collectionName}/${where.id.equals}`
    }

    if (!docId) {
      throw new Error('Document ID is required for delete')
    }

    // load the document first to return it
    const doc = await session.load(docId)

    if (!doc) {
      if (shouldCloseSession) {
        session.dispose()
      }
      return null
    }

    // delete the document
    session.delete(docId)

    if (shouldCloseSession) {
      await session.saveChanges()
      session.dispose()
    }

    return doc
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

