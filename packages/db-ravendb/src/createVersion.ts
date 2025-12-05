import type { CreateVersion } from 'payload'

import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { getCollectionName } from './utilities/getCollectionName.js'

export const createVersion: CreateVersion = async function createVersion(
  this: RavenDBAdapter,
  {
    autosave,
    collectionSlug,
    createdAt,
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
    const collectionName = getCollectionName(`${collectionSlug}_versions`)
    const fullId = `${collectionName}/${versionId}`

    await session.store(versionData, fullId)

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    const doc = await session.load(fullId)

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

