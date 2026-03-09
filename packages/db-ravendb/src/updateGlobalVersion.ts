import type { UpdateGlobalVersion } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'

export const updateGlobalVersion: UpdateGlobalVersion = async function updateGlobalVersion(
  this: RavenDBAdapter,
  { id, global: globalSlug, locale, req, versionData, where: whereArg = {} },
) {
  const where = id ? { id: { equals: id } } : whereArg

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    let docId: null | string = null

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      docId = `globals_versions/${globalSlug}/${where.id.equals}`
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
