import type { FlattenedField } from 'payload'

import type { RavenDBAdapter } from '../types.js'

import { getCollectionName } from '../utilities/getCollectionName.js'

type SanitizedQueryValue = {
  operator: string
  rawQuery?: unknown
  val: unknown
}

export function sanitizeQueryValue({
  adapter,
  collectionSlug,
  field,
  hasCustomID,
  locale,
  operator,
  parentIsLocalized,
  path,
  val,
}: {
  adapter: RavenDBAdapter
  collectionSlug?: string
  field: FlattenedField
  hasCustomID: boolean
  locale?: string
  operator: string
  parentIsLocalized: boolean
  path: string
  val: unknown
}): SanitizedQueryValue | undefined {
  let formattedValue = val
  let formattedOperator = operator
  if (val === null || val === undefined) {
    if (operator === 'equals') {
      formattedOperator = 'exists'
      formattedValue = false
    } else if (operator === 'not_equals') {
      formattedOperator = 'exists'
      formattedValue = true
    }
  }
  if (field.type === 'number' && typeof val === 'string') {
    const parsedNumber = parseFloat(val)
    if (!isNaN(parsedNumber)) {
      formattedValue = parsedNumber
    }
  }
  if (field.type === 'date' && typeof val === 'string') {
    formattedValue = new Date(val).toISOString()
  }
  if (field.type === 'checkbox' && typeof val === 'string') {
    formattedValue = val === 'true'
  }
  if ((operator === 'in' || operator === 'not_in' || operator === 'all') && Array.isArray(val)) {
    formattedValue = val.map((item) => {
      if (field.type === 'number' && typeof item === 'string') {
        const parsed = parseFloat(item)
        return isNaN(parsed) ? item : parsed
      }
      return item
    })
  }
  if ((field.type === 'relationship' || field.type === 'upload') && formattedValue) {
    if (Array.isArray(formattedValue)) {
      formattedValue = formattedValue.map((item) => String(item))
    } else {
      formattedValue = String(formattedValue)
    }
  }
  if (path === 'id' && formattedValue && collectionSlug) {
    const collectionName = getCollectionName(collectionSlug)

    if (hasCustomID && field.type === 'number') {
      if (typeof formattedValue === 'string') {
        const parsed = parseFloat(formattedValue)
        formattedValue = isNaN(parsed) ? formattedValue : parsed
      }
    } else {
      const addPrefix = (id: string) => {
        const idStr = String(id)
        return idStr.startsWith(`${collectionName}/`) ? idStr : `${collectionName}/${idStr}`
      }

      if (Array.isArray(formattedValue)) {
        formattedValue = formattedValue.map((item) => addPrefix(String(item)))
      } else {
        formattedValue = addPrefix(String(formattedValue))
      }
    }
  }

  return {
    operator: formattedOperator,
    val: formattedValue,
  }
}
