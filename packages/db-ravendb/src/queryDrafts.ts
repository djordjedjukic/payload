import type { PaginatedDocs, QueryDrafts } from 'payload'

import { buildVersionCollectionFields, combineQueries } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { extractIDFromRavenID } from './utilities/extractIDFromRavenID.js'
import { getSession } from './utilities/getSession.js'
import {
  filterVersionDocs,
  loadVersionDocs,
  sortVersionDocs,
} from './utilities/versionDocuments.js'

export const queryDrafts: QueryDrafts = async function queryDrafts(
  this: RavenDBAdapter,
  {
    collection: collectionSlug,
    joins = {},
    limit = 10,
    locale,
    page = 1,
    pagination = true,
    req,
    sort: sortArg,
    where = {},
  },
) {
  const collectionConfig = this.payload.collections[collectionSlug].config
  const versionFields = buildVersionCollectionFields(this.payload.config, collectionConfig, true)

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const combinedWhere = combineQueries({ latest: { equals: true } }, where)

    let versionDocs = await loadVersionDocs({ collectionSlug, session })
    versionDocs = await filterVersionDocs({
      adapter: this,
      collectionSlug,
      docs: versionDocs,
      fields: versionFields,
      locale,
      where: combinedWhere,
    })
    versionDocs = dedupeLatestDocs(versionDocs)
    versionDocs = sortVersionDocs(versionDocs, sortArg)

    const totalDocs = versionDocs.length

    if (pagination) {
      const skip = (page - 1) * limit
      versionDocs = versionDocs.slice(skip, skip + limit)
    } else if (limit > 0) {
      versionDocs = versionDocs.slice(0, limit)
    }

    const docs = versionDocs.map((doc: any) => ({
      ...(doc.version || {}),
      id: extractIDFromRavenID(doc.parent),
    }))

    if (shouldCloseSession) {
      session.dispose()
    }

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

    return result
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

function dedupeLatestDocs(docs: any[]) {
  const latestByParent = new Map<string, any>()

  for (const doc of docs) {
    const parent = String(extractIDFromRavenID(doc.parent) ?? '')
    const previous = latestByParent.get(parent)

    if (!previous || new Date(doc.updatedAt).getTime() > new Date(previous.updatedAt).getTime()) {
      latestByParent.set(parent, doc)
    }
  }

  return Array.from(latestByParent.values())
}
