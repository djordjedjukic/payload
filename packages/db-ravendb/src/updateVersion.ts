import type { UpdateVersion } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const updateVersion: UpdateVersion = async function updateVersion(
  this: RavenDBAdapter,
  { id, collection: collectionSlug, locale, req, versionData, where: whereArg = {} },
) {
  const where = id ? { id: { equals: id } } : whereArg

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(`${collectionSlug}_versions`)

    let docId: string | null = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      docId = `${collectionName}/${where.id.equals}`
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

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    const updatedDoc = await session.load(docId)

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

