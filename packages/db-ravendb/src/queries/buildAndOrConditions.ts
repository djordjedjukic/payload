import type { FlattenedField, Where } from 'payload'

import type { RavenDBAdapter } from '../types.js'
import type { QueryCondition } from './buildQuery.js'

import { parseParams } from './parseParams.js'

export async function buildAndOrConditions({
  adapter,
  collectionSlug,
  fields,
  globalSlug,
  locale,
  parentIsLocalized,
  where,
}: {
  adapter: RavenDBAdapter
  collectionSlug?: string
  fields: FlattenedField[]
  globalSlug?: string
  locale?: string
  parentIsLocalized: boolean
  where: Where[]
}): Promise<QueryCondition[]> {
  const promises = where.map(async (condition) => {
    const result = await parseParams({
      adapter,
      collectionSlug,
      fields,
      globalSlug,
      locale,
      parentIsLocalized,
      where: condition,
    })
    return result
  })

  const results = await Promise.all(promises)
  return results.filter((result) => Object.keys(result).length > 0)
}

