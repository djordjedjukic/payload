import type { CreateGlobalVersion } from 'payload'

import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'

export const createGlobalVersion: CreateGlobalVersion = async function createGlobalVersion(
  this: RavenDBAdapter,
  {
    autosave,
    createdAt,
    globalSlug,
    parent,
    publishedLocale,
    req,
    snapshot,
    updatedAt,
    versionData,
  },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const versionData = {
      autosave,
      createdAt: createdAt || new Date().toISOString(),
      latest: true,
      parent,
      publishedLocale,
      snapshot,
      updatedAt: updatedAt || new Date().toISOString(),
      version: snapshot,
    }

    const versionId = uuid()
    const docId = `globals_versions/${globalSlug}/${versionId}`

    await session.store(versionData, docId)

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    const doc = await session.load(docId)

    if (shouldCloseSession) {
      session.dispose()
    }

    return doc as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

