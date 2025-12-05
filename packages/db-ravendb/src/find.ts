import type { Find, PaginatedDocs } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'
import { getCollectionName } from './utilities/getCollectionName.js'
import { buildQuery } from './queries/buildQuery.js'

export const find: Find = async function find(
  this: RavenDBAdapter,
  {
    collection: collectionSlug,
    joins = {},
    limit = 10,
    locale,
    page = 1,
    pagination = true,
    req,
    select,
    sort: sortArg,
    where = {},
  },
) {
  console.log('[RavenDB] find called for collection:', collectionSlug, 'pagination:', pagination, 'limit:', limit, 'page:', page)

  const collectionConfig = this.payload.collections[collectionSlug].config

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    let query = session.query({ collection: collectionName })

    // apply where conditions using the new query builder
    query = await buildQuery({
      adapter: this,
      collectionSlug,
      fields: collectionConfig.flattenedFields,
      locale,
      query,
      where,
    })

    // wait for non-stale results to ensure we get the latest data
    query = query.waitForNonStaleResults()

    // apply sorting
    if (sortArg) {
      let sortField: string
      let sortOrder: 'asc' | 'desc' | 1 | -1

      if (typeof sortArg === 'string') {
        // handle string format like "name" or "-name"
        if (sortArg.startsWith('-')) {
          sortField = sortArg.substring(1)
          sortOrder = 'desc'
        } else {
          sortField = sortArg
          sortOrder = 'asc'
        }
      } else {
        // handle object format like { name: 'asc' } or { name: -1 }
        sortField = Object.keys(sortArg)[0]
        sortOrder = sortArg[sortField]
      }

      console.log('[RavenDB] Applying sort:', { sortField, sortOrder, sortArg })

      if (sortOrder === 'desc' || sortOrder === -1) {
        query = query.orderByDescending(sortField)
      } else {
        query = query.orderBy(sortField)
      }
    }

    // get total count for pagination (with same where conditions)
    let countQuery = session.query({ collection: collectionName })
    countQuery = await buildQuery({
      adapter: this,
      collectionSlug,
      fields: collectionConfig.flattenedFields,
      locale,
      query: countQuery,
      where,
    })
    const totalDocs = await countQuery.count()

    // apply pagination
    if (pagination) {
      const skip = (page - 1) * limit
      query = query.skip(skip).take(limit)
    } else if (limit > 0) {
      query = query.take(limit)
    }

    const docs = await query.all()

    console.log('[RavenDB] Query returned:', docs.length, 'docs')
    if (sortArg && docs.length > 0) {
      let sortField: string
      if (typeof sortArg === 'string') {
        sortField = sortArg.startsWith('-') ? sortArg.substring(1) : sortArg
      } else {
        sortField = Object.keys(sortArg)[0]
      }
      console.log('[RavenDB] First doc sortField value:', docs[0][sortField])
      if (docs.length > 1) {
        console.log('[RavenDB] Second doc sortField value:', docs[1][sortField])
      }
    }

    if (shouldCloseSession) {
      session.dispose()
    }

    // transform all docs
    docs.forEach(doc => {
      transform({ adapter: this, data: doc, fields: collectionConfig.fields, operation: 'read' })
    })

    // resolve relationships/joins
    if (Object.keys(joins).length > 0) {
      await this.resolveRelationships({
        collectionSlug,
        docs,
        fields: collectionConfig.flattenedFields,
        joins,
        locale,
      })
    }

    if (!pagination) {
      return {
        docs,
        hasNextPage: false,
        hasPrevPage: false,
        limit,
        nextPage: null,
        page: 1,
        pagingCounter: 1,
        prevPage: null,
        totalDocs: docs.length,
        totalPages: 1,
      }
    }

    const totalPages = Math.ceil(totalDocs / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    const result: PaginatedDocs = {
      docs,
      hasNextPage,
      hasPrevPage,
      limit,
      nextPage: hasNextPage ? page + 1 : null,
      page,
      pagingCounter: (page - 1) * limit + 1,
      prevPage: hasPrevPage ? page - 1 : null,
      totalDocs,
      totalPages,
    }

    console.log('[RavenDB] Returning result:', {
      docsLength: result.docs?.length,
      docsIsArray: Array.isArray(result.docs),
      totalDocs: result.totalDocs,
      page: result.page,
    })

    return result
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

