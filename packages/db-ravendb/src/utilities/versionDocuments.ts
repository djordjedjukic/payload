import type { FlattenedField, Sort, Where } from 'payload'
import type { IDocumentSession } from 'ravendb'

import type { RavenDBAdapter } from '../types.js'

import { parseParams } from '../queries/parseParams.js'
import { extractIDFromRavenID } from './extractIDFromRavenID.js'
import { getCollectionName } from './getCollectionName.js'

const pageSize = 100

type SessionWithPrefixLoad = {
  loadStartingWith<T>(idPrefix: string, opts?: { pageSize?: number; start?: number }): Promise<T[]>
} & IDocumentSession

export async function loadVersionDocs({
  collectionSlug,
  session,
}: {
  collectionSlug: string
  session: IDocumentSession
}) {
  const prefixSession = session as SessionWithPrefixLoad
  const prefix = `${getCollectionName(`${collectionSlug}_versions`)}/`
  const docs: any[] = []
  let start = 0

  while (true) {
    const page = await prefixSession.loadStartingWith<any>(prefix, { pageSize, start })

    if (!page.length) {
      break
    }

    docs.push(...page)
    start += page.length

    if (page.length < pageSize) {
      break
    }
  }

  return docs
}

export async function filterVersionDocs({
  adapter,
  collectionSlug,
  docs,
  fields,
  locale,
  where,
}: {
  adapter: RavenDBAdapter
  collectionSlug: string
  docs: any[]
  fields: FlattenedField[]
  locale?: string
  where: Where
}) {
  const conditions = await parseParams({
    adapter,
    collectionSlug,
    fields,
    locale,
    parentIsLocalized: false,
    where,
  })

  return docs.filter((doc) => matches(doc, conditions))
}

export function sortVersionDocs<T extends Record<string, any>>(docs: T[], sortArg?: Sort) {
  const sorts = Array.isArray(sortArg) ? sortArg : sortArg ? [sortArg] : []

  if (!sorts.length) {
    return docs
  }

  return [...docs].sort((left, right) => {
    for (const sort of sorts) {
      const descending = sort.startsWith('-')
      const path = descending ? sort.slice(1) : sort
      const leftValue = getValue(left, path)
      const rightValue = getValue(right, path)

      if (leftValue === rightValue) {
        continue
      }

      if (leftValue == null) {
        return descending ? 1 : -1
      }

      if (rightValue == null) {
        return descending ? -1 : 1
      }

      const comparison = leftValue > rightValue ? 1 : -1
      return descending ? -comparison : comparison
    }

    return 0
  })
}

function matches(doc: any, conditions: Record<string, any>) {
  if (!conditions || !Object.keys(conditions).length) {
    return true
  }

  if (
    conditions.$and &&
    !conditions.$and.every((condition: Record<string, any>) => matches(doc, condition))
  ) {
    return false
  }

  if (
    conditions.$or &&
    !conditions.$or.some((condition: Record<string, any>) => matches(doc, condition))
  ) {
    return false
  }

  return Object.entries(conditions).every(([path, condition]) => {
    if (path.startsWith('$')) {
      return true
    }

    return matchesCondition(path, getValue(doc, path), condition)
  })
}

function matchesCondition(path: string, actualValue: unknown, condition: any) {
  if (!condition || Array.isArray(condition) || typeof condition !== 'object') {
    return equals(path, actualValue, condition)
  }

  return Object.entries(condition).every(([operator, expectedValue]) => {
    switch (operator) {
      case '$all':
        return Array.isArray(actualValue) && Array.isArray(expectedValue)
          ? expectedValue.every((value) => actualValue.some((item) => equals(path, item, value)))
          : false
      case '$eq':
        return equals(path, actualValue, expectedValue)
      case '$exists':
        return expectedValue
          ? actualValue !== undefined && actualValue !== null
          : actualValue == null
      case '$gt':
        return actualValue != null && actualValue > expectedValue
      case '$gte':
        return actualValue != null && actualValue >= expectedValue
      case '$in':
        return (
          Array.isArray(expectedValue) &&
          expectedValue.some((value) => equals(path, actualValue, value))
        )
      case '$lt':
        return actualValue != null && actualValue < expectedValue
      case '$lte':
        return actualValue != null && actualValue <= expectedValue
      case '$ne':
        return !equals(path, actualValue, expectedValue)
      case '$nin':
        return (
          Array.isArray(expectedValue) &&
          !expectedValue.some((value) => equals(path, actualValue, value))
        )
      case '$regex': {
        const expression =
          expectedValue instanceof RegExp ? expectedValue : new RegExp(String(expectedValue))
        return expression.test(String(actualValue ?? ''))
      }
      default:
        return true
    }
  })
}

function equals(path: string, left: unknown, right: unknown) {
  if (path === 'id' || path === 'parent') {
    return normalizeID(left) === normalizeID(right)
  }

  return left === right
}

function getValue(doc: Record<string, any>, path: string) {
  if (path === 'id') {
    return doc?.['@metadata']?.['@id'] ?? doc?.id
  }

  return path.split('.').reduce((value, segment) => value?.[segment], doc)
}

function normalizeID(value: unknown) {
  if (value == null) {
    return value
  }

  return extractIDFromRavenID(String(value))
}
