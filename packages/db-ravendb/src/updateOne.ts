import type { UpdateOne } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { handleError } from './utilities/handleError.js'
import { transform } from './utilities/transform.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const updateOne: UpdateOne = async function updateOne(
  this: RavenDBAdapter,
  {
    id,
    collection: collectionSlug,
    data,
    locale,
    req,
    returning,
    select,
    where: whereArg = {},
  },
) {
  const collectionConfig = this.payload.collections[collectionSlug].config
  const where = id ? { id: { equals: id } } : whereArg

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    // find the document to update
    let docId: string | null = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      const idValue = String(where.id.equals)
      // check if ID already has collection prefix
      if (idValue.startsWith(`${collectionName}/`)) {
        docId = idValue
      } else {
        docId = `${collectionName}/${idValue}`
      }
    }

    if (!docId) {
      throw new Error('Document ID is required for update')
    }

    // load the document
    const doc = await session.load(docId)

    if (!doc) {
      if (shouldCloseSession) {
        session.dispose()
      }
      return null
    }

    // merge the data
    Object.assign(doc, data)

    transform({
      adapter: this,
      data: doc,
      fields: collectionConfig.fields,
      operation: 'write',
    })

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    if (returning === false) {
      if (shouldCloseSession) {
        session.dispose()
      }
      return null
    }

    // reload to get updated data
    const updatedDoc = await session.load(docId)

    if (shouldCloseSession) {
      session.dispose()
    }

    if (!updatedDoc) {
      return null
    }

    transform({
      adapter: this,
      data: updatedDoc,
      fields: collectionConfig.fields,
      operation: 'read',
    })

    return updatedDoc
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    handleError({ collection: collectionSlug, error, req })
  }
}

