import type { FlattenedField, Operator, Where } from 'payload'

import { deepMergeWithCombinedArrays } from 'payload'
import { validOperatorSet } from 'payload/shared'

import type { RavenDBAdapter } from '../types.js'
import type { QueryCondition } from './buildQuery.js'

import { buildAndOrConditions } from './buildAndOrConditions.js'
import { buildSearchParam } from './buildSearchParam.js'

export async function parseParams({
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
  where: Where
}): Promise<QueryCondition> {
  let result: QueryCondition = {}

  if (typeof where === 'object') {
    // determine if the whereKey is an AND, OR, or a schema path
    for (const relationOrPath of Object.keys(where)) {
      const condition = where[relationOrPath]
      let conditionOperator: '$and' | '$or' | null = null
      
      if (relationOrPath.toLowerCase() === 'and') {
        conditionOperator = '$and'
      } else if (relationOrPath.toLowerCase() === 'or') {
        conditionOperator = '$or'
      }
      
      if (Array.isArray(condition)) {
        const builtConditions = await buildAndOrConditions({
          adapter,
          collectionSlug,
          fields,
          globalSlug,
          locale,
          parentIsLocalized,
          where: condition,
        })
        
        if (builtConditions.length > 0 && conditionOperator !== null) {
          result[conditionOperator] = builtConditions
        }
      } else {
        // it's a path - there can be multiple comparisons on a single path
        const pathOperators = where[relationOrPath]
        
        if (typeof pathOperators === 'object') {
          const validOperators = Object.keys(pathOperators).filter((operator) =>
            validOperatorSet.has(operator as Operator),
          )

          for (const operator of validOperators) {
            const searchParam = await buildSearchParam({
              adapter,
              collectionSlug,
              fields,
              globalSlug,
              incomingPath: relationOrPath,
              locale,
              operator,
              parentIsLocalized,
              val: (pathOperators as Record<string, Where>)[operator],
            })

            if (searchParam?.value && searchParam?.path) {
              if (validOperators.length > 1) {
                if (!result.$and) {
                  result.$and = []
                }
                result.$and.push({
                  [searchParam.path]: searchParam.value,
                })
              } else {
                if (result[searchParam.path]) {
                  if (!result.$and) {
                    result.$and = []
                  }

                  result.$and.push({ [searchParam.path]: result[searchParam.path] })
                  result.$and.push({
                    [searchParam.path]: searchParam.value,
                  })
                  delete result[searchParam.path]
                } else {
                  result[searchParam.path] = searchParam.value
                }
              }
            } else if (typeof searchParam?.value === 'object') {
              result = deepMergeWithCombinedArrays(result, searchParam.value ?? {}, {
                clone: false,
              })
            }
          }
        }
      }
    }
  }

  return result
}

