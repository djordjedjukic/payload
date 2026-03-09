import { buildVersionCollectionFields, type CreateVersion } from 'payload'
import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'
import { loadVersionDocs } from './utilities/versionDocuments.js'

export const createVersion: CreateVersion = async function createVersion(
  this: RavenDBAdapter,
  {
    autosave,
    collectionSlug,
    createdAt,
    parent,
    publishedLocale,
    req,
    returning,
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

    const collectionConfig = this.payload.collections[collectionSlug].config
    const versionFields = buildVersionCollectionFields(this.payload.config, collectionConfig, true)
    const collectionName = getCollectionName(`${collectionSlug}_versions`)
    const versionDoc = {
      '@metadata': {
        '@collection': collectionName,
        'Raven-Node-Type': collectionName,
      },
      autosave,
      createdAt: createdAt || new Date().toISOString(),
      latest: true,
      parent,
      publishedLocale,
      snapshot,
      updatedAt: updatedAt || new Date().toISOString(),
      version: versionData,
    }

    const versionId = uuid()
    const fullId = `${collectionName}/${versionId}`

    const previousLatestDocs = (await loadVersionDocs({ collectionSlug, session })).filter(
      (doc) => doc.latest === true && normalizeParent(doc.parent) === normalizeParent(parent),
    )

    for (const doc of previousLatestDocs) {
      if (new Date(doc.updatedAt).getTime() < new Date(versionDoc.updatedAt).getTime()) {
        doc.latest = false
      }
    }

    await session.store(versionDoc, fullId)
    await session.saveChanges()

    if (returning === false) {
      if (shouldCloseSession) {
        session.dispose()
      }

      return null as any
    }

    const doc = await session.load(fullId)

    if (doc) {
      transform({
        adapter: this,
        data: doc,
        fields: versionFields,
        operation: 'read',
      })
    }

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

function normalizeParent(value: unknown) {
  return typeof value === 'string' ? value.split('/').pop() : value
}
