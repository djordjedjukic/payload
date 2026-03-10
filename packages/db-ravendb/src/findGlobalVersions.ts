import type { FindGlobalVersions, PaginatedDocs } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'

export const findGlobalVersions: FindGlobalVersions = async function findGlobalVersions(
  this: RavenDBAdapter,
  {
    global: globalSlug,
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
    let query = session.query({ collection: 'globals_versions' })
    query = query.whereStartsWith('@id', `globals_versions/${globalSlug}/`)

    if (sortArg) {
      const sortField = typeof sortArg === 'string' ? sortArg : Object.keys(sortArg)[0]
      const sortOrder = typeof sortArg === 'string' ? 'asc' : sortArg[sortField]

      if (sortOrder === 'desc' || sortOrder === -1) {
        query = query.orderByDescending(sortField)
      } else {
        query = query.orderBy(sortField)
      }
    }

    const totalQuery = session
      .query({ collection: 'globals_versions' })
      .whereStartsWith('@id', `globals_versions/${globalSlug}/`)
    const totalDocs = await totalQuery.count()

    if (pagination) {
      const skip = (page - 1) * limit
      query = query.skip(skip).take(limit)
    } else if (limit > 0) {
      query = query.take(limit)
    }

    const docs = await query.all()

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
