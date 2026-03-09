import { buildVersionCollectionFields, type FindVersions, type PaginatedDocs } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'
import {
  filterVersionDocs,
  loadVersionDocs,
  sortVersionDocs,
} from './utilities/versionDocuments.js'

export const findVersions: FindVersions = async function findVersions(
  this: RavenDBAdapter,
  {
    collection: collectionSlug,
    limit = 10,
    locale,
    page = 1,
    pagination = true,
    req,
    sort: sortArg,
    where = {},
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

    let docs = await loadVersionDocs({ collectionSlug, session })
    docs = await filterVersionDocs({
      adapter: this,
      collectionSlug,
      docs,
      fields: versionFields,
      locale,
      where,
    })
    docs = sortVersionDocs(docs, sortArg || '-updatedAt')

    const totalDocs = docs.length

    if (pagination) {
      const skip = (page - 1) * limit
      docs = docs.slice(skip, skip + limit)
    } else if (limit > 0) {
      docs = docs.slice(0, limit)
    }

    for (const doc of docs) {
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

    return result
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}
