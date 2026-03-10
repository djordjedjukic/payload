import type { FlattenedField, Operator, PathToQuery } from 'payload'

import { getLocalizedPaths } from 'payload'
import { validOperatorSet } from 'payload/shared'

import type { RavenDBAdapter } from '../types.js'
import type { OperatorMapKey } from './operatorMap.js'

import { operatorMap } from './operatorMap.js'
import { sanitizeQueryValue } from './sanitizeQueryValue.js'

type SearchParam = {
  path?: string
  rawQuery?: unknown
  value?: unknown
}

export function buildSearchParam({
  adapter,
  collectionSlug,
  fields,
  globalSlug,
  incomingPath,
  locale,
  operator,
  parentIsLocalized,
  val,
}: {
  adapter: RavenDBAdapter
  collectionSlug?: string
  fields: FlattenedField[]
  globalSlug?: string
  incomingPath: string
  locale?: string
  operator: string
  parentIsLocalized: boolean
  val: unknown
}): SearchParam | undefined {
  let sanitizedPath = incomingPath.replace(/__/g, '.')

  if (sanitizedPath === 'id') {
    sanitizedPath = 'id' // RavenDB uses 'id' not '_id'
  }

  let paths: PathToQuery[] = []

  let hasCustomID = false

  if (sanitizedPath === 'id') {
    const customIDFieldType = collectionSlug
      ? adapter.payload.collections[collectionSlug]?.customIDType
      : undefined

    let idFieldType: 'number' | 'text' = 'text'

    if (customIDFieldType) {
      idFieldType = customIDFieldType
      hasCustomID = true
    }

    paths.push({
      collectionSlug,
      complete: true,
      field: {
        name: 'id',
        type: idFieldType,
      } as FlattenedField,
      parentIsLocalized: parentIsLocalized ?? false,
      path: 'id',
    })
  } else {
    paths = getLocalizedPaths({
      collectionSlug,
      fields,
      globalSlug,
      incomingPath: sanitizedPath,
      locale,
      parentIsLocalized,
      payload: adapter.payload,
    })
  }

  if (!paths[0]) {
    return undefined
  }

  const [{ field, path }] = paths

  if (path) {
    const sanitizedQueryValue = sanitizeQueryValue({
      adapter,
      collectionSlug,
      field,
      hasCustomID,
      locale,
      operator,
      parentIsLocalized,
      path,
      val,
    })

    if (!sanitizedQueryValue) {
      return undefined
    }

    const { operator: formattedOperator, rawQuery, val: formattedValue } = sanitizedQueryValue

    if (rawQuery) {
      return { value: rawQuery }
    }

    if (!formattedOperator) {
      return undefined
    }

    if (paths.length > 1) {
      // Multi-collection relationship filtering is not implemented yet,
      // so fall back to the first resolved path.
      const operatorKey = operatorMap[formattedOperator as OperatorMapKey]

      if (operatorKey) {
        return {
          path,
          value: { [operatorKey]: formattedValue },
        }
      }
    }

    if (formattedOperator && validOperatorSet.has(formattedOperator as Operator)) {
      const operatorKey = operatorMap[formattedOperator as OperatorMapKey]

      if (field.type === 'relationship' || field.type === 'upload') {
        return {
          path,
          value: { [operatorKey]: formattedValue },
        }
      }

      if (formattedOperator === 'like' && typeof formattedValue === 'string') {
        const words = formattedValue.split(' ')

        const result = {
          value: {
            $and: words.map((word) => ({
              [path]: {
                $options: 'i',
                $regex: word.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
              },
            })),
          },
        }

        return result
      }

      if (formattedOperator === 'not_like' && typeof formattedValue === 'string') {
        const words = formattedValue.split(' ')

        const result = {
          value: {
            $and: words.map((word) => ({
              [path]: {
                $not: {
                  $options: 'i',
                  $regex: word.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
                },
              },
            })),
          },
        }

        return result
      }

      if (formattedOperator === 'contains' && typeof formattedValue === 'string') {
        return {
          path,
          value: {
            $options: 'i',
            $regex: formattedValue.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
          },
        }
      }

      // Some operators are emitted as full query fragments instead of mapped operator objects.
      if (!operatorKey) {
        return {
          path,
          value: formattedValue,
        }
      }

      return {
        path,
        value: { [operatorKey]: formattedValue },
      }
    }
  }

  return undefined
}
