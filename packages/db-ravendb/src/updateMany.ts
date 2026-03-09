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

    // build query to find documents
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

    // get all matching documents
    const docs = await query.all()

    if (!docs || docs.length === 0) {
      return null
    }

    // update each document
    const updatedDocs = []
    for (const doc of docs) {
      // merge data
      Object.assign(doc, data)

      // transform before saving
      transform({
        adapter: this,
        data: doc,
        fields: collectionConfig.fields,
        operation: 'write',
      })

      updatedDocs.push(doc)
    }

    await session.saveChanges()

    // transform for reading
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
