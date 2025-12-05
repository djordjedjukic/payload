import type { FlattenedField, Where } from 'payload'
import type { IDocumentQuery } from 'ravendb'

import type { RavenDBAdapter } from '../types.js'

import { parseParams } from './parseParams.js'

export async function buildQuery({
  adapter,
  collectionSlug,
  fields,
  globalSlug,
  locale,
  query,
  where,
}: {
  adapter: RavenDBAdapter
  collectionSlug?: string
  fields: FlattenedField[]
  globalSlug?: string
  locale?: string
  query: IDocumentQuery<any>
  where: Where
}): Promise<IDocumentQuery<any>> {
  const conditions = await parseParams({
    adapter,
    collectionSlug,
    fields,
    globalSlug,
    locale,
    parentIsLocalized: false,
    where,
  })

  // apply conditions to the query
  return applyConditions(query, conditions)
}

function applyConditions(
  query: IDocumentQuery<any>,
  conditions: QueryCondition,
): IDocumentQuery<any> {
  if (!conditions) {
    return query
  }

  // handle logical operators
  if (conditions.$and) {
    for (const condition of conditions.$and) {
      query = applyConditions(query, condition)
    }
    return query
  }

  if (conditions.$or) {
    query = query.openSubclause()
    for (let i = 0; i < conditions.$or.length; i++) {
      if (i > 0) {
        query = query.orElse()
      }
      query = applyConditions(query, conditions.$or[i])
    }
    query = query.closeSubclause()
    return query
  }

  // handle field conditions
  for (const [path, value] of Object.entries(conditions)) {
    if (path.startsWith('$')) {
      continue // skip logical operators
    }

    if (typeof value === 'object' && value !== null) {
      // handle operators
      for (const [operator, operatorValue] of Object.entries(value)) {
        query = applyOperator(query, path, operator, operatorValue)
      }
    } else {
      // direct equality
      query = query.whereEquals(path, value)
    }
  }

  return query
}

function applyOperator(
  query: IDocumentQuery<any>,
  path: string,
  operator: string,
  value: any,
): IDocumentQuery<any> {
  switch (operator) {
    case '$eq':
      return query.whereEquals(path, value)

    case '$ne':
      return query.whereNotEquals(path, value)

    case '$gt':
      return query.whereGreaterThan(path, value)

    case '$gte':
      return query.whereGreaterThanOrEqual(path, value)

    case '$lt':
      return query.whereLessThan(path, value)

    case '$lte':
      return query.whereLessThanOrEqual(path, value)

    case '$in':
      return query.whereIn(path, value)

    case '$nin':
      return query.openSubclause().not().whereIn(path, value).closeSubclause()

    case '$exists':
      if (value) {
        return query.whereExists(path)
      } else {
        return query.openSubclause().not().whereExists(path).closeSubclause()
      }

    case '$regex':
      // RavenDB uses search() for text search
      return query.search(path, value.source || value)

    case '$all':
      // all values must be in array
      if (Array.isArray(value)) {
        for (const item of value) {
          query = query.containsAll(path, [item])
        }
      }
      return query

    default:
      // unsupported operator, skip
      return query
  }
}

export type QueryCondition = {
  $and?: QueryCondition[]
  $or?: QueryCondition[]
  [key: string]: any
}

