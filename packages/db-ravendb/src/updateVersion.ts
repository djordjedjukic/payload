import { buildVersionCollectionFields, type UpdateVersion } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { extractIDFromRavenID } from './utilities/extractIDFromRavenID.js'
import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const updateVersion: UpdateVersion = async function updateVersion(
  this: RavenDBAdapter,
  { id, collection: collectionSlug, locale, req, returning, versionData, where: whereArg = {} },
) {
  const where = id ? { id: { equals: id } } : whereArg

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionConfig = this.payload.collections[collectionSlug].config
    const versionFields = buildVersionCollectionFields(this.payload.config, collectionConfig, true)
    const collectionName = getCollectionName(`${collectionSlug}_versions`)

    let docId: null | string = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      docId = `${collectionName}/${extractIDFromRavenID(String(where.id.equals))}`
    }

    if (!docId) {
      throw new Error('Version ID is required for update')
    }

    const doc = await session.load(docId)

    if (!doc) {
      if (shouldCloseSession) {
        session.dispose()
      }
      return null
    }

    Object.assign(doc, versionData)
    await session.saveChanges()

    if (returning === false) {
      if (shouldCloseSession) {
        session.dispose()
      }

      return null as any
    }

    const updatedDoc = await session.load(docId)

    if (updatedDoc) {
      transform({
        adapter: this,
        data: updatedDoc,
        fields: versionFields,
        operation: 'read',
      })
    }

    if (shouldCloseSession) {
      session.dispose()
    }

    return updatedDoc as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}
