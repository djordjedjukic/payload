import type { UpdateMany } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const updateMany: UpdateMany = async function updateMany(
  this: RavenDBAdapter,
  { collection: collectionSlug, data, req, where },
) {
  const collectionConfig = this.payload.collections[collectionSlug].config

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)
    let query = session.query({ collection: collectionName })

    if (where) {
      query = buildQuery({
        adapter: this,
        fields: collectionConfig.flattenedFields,
        locale: req?.locale,
        query,
        where,
      }) as any
    }

    const docs = await query.all()

    if (!docs || docs.length === 0) {
      return null
    }

    const updatedDocs = []
    for (const doc of docs) {
      Object.assign(doc, data)
      transform({
        adapter: this,
        data: doc,
        fields: collectionConfig.fields,
        operation: 'write',
      })

      updatedDocs.push(doc)
    }

    await session.saveChanges()
    for (const doc of updatedDocs) {
      transform({
        adapter: this,
        data: doc,
        fields: collectionConfig.fields,
        operation: 'read',
      })
    }

    return updatedDocs as any
  } finally {
    if (shouldCloseSession && session) {
      session.dispose()
    }
  }
}
