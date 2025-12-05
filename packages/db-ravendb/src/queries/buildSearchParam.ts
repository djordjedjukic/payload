import type { FlattenedField, Operator, PathToQuery } from 'payload'

import { getFieldByPath, getLocalizedPaths } from 'payload'
import { validOperatorSet } from 'payload/shared'

import type { RavenDBAdapter } from '../types.js'
import type { OperatorMapKey } from './operatorMap.js'

import { getCollectionName } from '../utilities/getCollectionName.js'
import { operatorMap } from './operatorMap.js'
import { sanitizeQueryValue } from './sanitizeQueryValue.js'

type SearchParam = {
  path?: string
  rawQuery?: unknown
  value?: unknown
}

/**
 * Convert the Payload key / value / operator into a RavenDB query condition
 */
export async function buildSearchParam({
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
}): Promise<SearchParam | undefined> {
  // replace GraphQL nested field double underscore formatting
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

    // handle relationships - if querying across collections
    if (paths.length > 1) {
      // TODO: implement relationship queries
      // for now, just use the first path
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

      // handle relationship fields
      if (field.type === 'relationship' || field.type === 'upload') {
        // for relationships, we store IDs as strings
        // handle both string and array values
        return {
          path,
          value: { [operatorKey]: formattedValue },
        }
      }

      // handle 'like' operator - convert to regex
      if (formattedOperator === 'like' && typeof formattedValue === 'string') {
        const words = formattedValue.split(' ')

        const result = {
          value: {
            $and: words.map((word) => ({
              [path]: {
                $regex: word.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
                $options: 'i',
              },
            })),
          },
        }

        return result
      }

      // handle 'not_like' operator
      if (formattedOperator === 'not_like' && typeof formattedValue === 'string') {
        const words = formattedValue.split(' ')

        const result = {
          value: {
            $and: words.map((word) => ({
              [path]: {
                $not: {
                  $regex: word.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
                  $options: 'i',
                },
              },
            })),
          },
        }

        return result
      }

      // handle 'contains' operator
      if (formattedOperator === 'contains' && typeof formattedValue === 'string') {
        return {
          path,
          value: {
            $regex: formattedValue.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'),
            $options: 'i',
          },
        }
      }

      // some operators like 'near' need to define a full query
      // so if there is no operator key, just return the value
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

