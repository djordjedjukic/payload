import type { FindOne } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { buildQuery } from './queries/buildQuery.js'
import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const findOne: FindOne = async function findOne(
  this: RavenDBAdapter,
  { collection: collectionSlug, joins = {}, locale, req, select, where = {} },
) {
  const collectionConfig = this.payload.collections[collectionSlug].config

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)
    let doc = null

    console.log('[RavenDB] findOne:', {
      collectionName,
      collectionSlug,
      where: JSON.stringify(where, null, 2),
    })

    if (where.id && typeof where.id === 'object' && 'equals' in where.id) {
      let docId = where.id.equals as string
      if (!docId.startsWith(`${collectionName}/`)) {
        docId = `${collectionName}/${docId}`
      }
      console.log('[RavenDB] Loading by ID:', docId)
      doc = await session.load(docId)
      console.log('[RavenDB] Loaded doc:', !!doc)
    } else {
      console.log('[RavenDB] Querying with where clause')
      let query = session.query({ collection: collectionName })

      query = await buildQuery({
        adapter: this,
        collectionSlug,
        fields: collectionConfig.flattenedFields,
        locale,
        query,
        where,
      })

      // Give RavenDB extra time here because indexes may still be warming up.
      query = query.waitForNonStaleResults(15000)

      const results = await query.take(1).all()
      console.log('[RavenDB] Query results:', results?.length || 0, 'results:', results)

      if (results && results.length > 0) {
        doc = results[0]
      }
    }

    if (shouldCloseSession) {
      session.dispose()
    }

    if (!doc) {
      return null
    }

    transform({ adapter: this, data: doc, fields: collectionConfig.fields, operation: 'read' })
    if (Object.keys(joins).length > 0) {
      await this.resolveRelationships({
        collectionSlug,
        docs: [doc],
        fields: collectionConfig.flattenedFields,
        joins,
        locale,
      })
    }

    return doc
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}
