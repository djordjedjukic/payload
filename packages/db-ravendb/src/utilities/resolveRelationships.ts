import type { FlattenedField, JoinQuery } from 'payload'

import { fieldAffectsData } from 'payload/shared'

import type { RavenDBAdapter } from '../types.js'

import { getCollectionName } from './getCollectionName.js'
import { transform } from './transform.js'

export type ResolveRelationshipsArgs = {
  adapter: RavenDBAdapter
  collectionSlug: string
  depth?: number
  docs: Record<string, unknown>[]
  fields: FlattenedField[]
  joins?: JoinQuery
  locale?: string
}

export async function resolveRelationships({
  adapter,
  collectionSlug,
  depth = 1,
  docs,
  fields,
  joins,
  locale,
}: ResolveRelationshipsArgs): Promise<void> {
  if (!docs || docs.length === 0 || depth === 0) {
    return
  }
  const relationshipFields = fields.filter(
    (field) =>
      fieldAffectsData(field) && (field.type === 'relationship' || field.type === 'upload'),
  )

  if (relationshipFields.length === 0) {
    return
  }

  const session = adapter.store.openSession(adapter.database)

  try {
    for (const doc of docs) {
      for (const field of relationshipFields) {
        const fieldValue = doc[field.name]

        if (!fieldValue) {
          continue
        }

        if ('hasMany' in field && (field as any).hasMany && Array.isArray(fieldValue)) {
          const populatedValues = []

          for (const item of fieldValue) {
            if (typeof item === 'object' && item !== null) {
              populatedValues.push(item)
              continue
            }

            const relatedDoc = await loadRelatedDocument({
              id: item,
              adapter,
              field,
              session,
            })

            if (relatedDoc) {
              populatedValues.push(relatedDoc)
            } else {
              populatedValues.push(item)
            }
          }

          doc[field.name] = populatedValues
        } else {
          if (typeof fieldValue === 'object' && fieldValue !== null) {
            continue
          }

          const relatedDoc = await loadRelatedDocument({
            id: fieldValue,
            adapter,
            field,
            session,
          })

          if (relatedDoc) {
            doc[field.name] = relatedDoc
          }
        }
      }
    }
  } finally {
    session.dispose()
  }
}

async function loadRelatedDocument({
  id,
  adapter,
  field,
  session,
}: {
  adapter: RavenDBAdapter
  field: FlattenedField
  id: any
  session: any
}): Promise<null | Record<string, unknown>> {
  try {
    let relationTo: string

    if (field.type === 'upload') {
      relationTo = field.relationTo
    } else if (field.type === 'relationship') {
      if (Array.isArray(field.relationTo)) {
        // Polymorphic relationship values do not encode the collection,
        // so probe each candidate collection until one matches.
        for (const collection of field.relationTo) {
          const collectionName = getCollectionName(collection)
          const fullId = `${collectionName}/${id}`

          try {
            const doc = await session.load(fullId)
            if (doc) {
              const collectionConfig = adapter.payload.collections[collection]?.config
              if (collectionConfig) {
                transform({
                  adapter,
                  data: doc,
                  fields: collectionConfig.fields,
                  operation: 'read',
                })
              }
              return doc
            }
          } catch (error) {
            continue
          }
        }
        return null
      } else {
        relationTo = field.relationTo
      }
    } else {
      return null
    }
    const collectionName = getCollectionName(relationTo)
    const fullId = `${collectionName}/${id}`

    const doc = await session.load(fullId)

    if (doc) {
      const collectionConfig = adapter.payload.collections[relationTo]?.config
      if (collectionConfig) {
        transform({
          adapter,
          data: doc,
          fields: collectionConfig.fields,
          operation: 'read',
        })
      }
    }

    return doc
  } catch (error) {
    return null
  }
}
