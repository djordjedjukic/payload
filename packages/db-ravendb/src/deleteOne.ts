import type { DeleteOne } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'

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

    let docId: null | string = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      const equals = where.id.equals

      if (typeof equals === 'number' || typeof equals === 'string') {
        docId = `${collectionName}/${String(equals)}`
      }
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
    await session.delete(docId)

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
