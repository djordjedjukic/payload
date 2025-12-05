import type { FlattenedField, JoinQuery } from 'payload'

import { fieldAffectsData } from 'payload/shared'

import type { RavenDBAdapter } from '../types.js'

import { getCollectionName } from './getCollectionName.js'
import { transform } from './transform.js'

export type ResolveRelationshipsArgs = {
  adapter: RavenDBAdapter
  collectionSlug: string
  docs: Record<string, unknown>[]
  fields: FlattenedField[]
  joins?: JoinQuery
  locale?: string
  depth?: number
}

/**
 * Resolves relationship fields by loading related documents
 * This replaces IDs with full document objects
 */
export async function resolveRelationships({
  adapter,
  collectionSlug,
  docs,
  fields,
  joins,
  locale,
  depth = 1,
}: ResolveRelationshipsArgs): Promise<void> {
  if (!docs || docs.length === 0 || depth === 0) {
    return
  }

  // find all relationship fields
  const relationshipFields = fields.filter(
    (field) =>
      fieldAffectsData(field) &&
      (field.type === 'relationship' || field.type === 'upload'),
  )

  if (relationshipFields.length === 0) {
    return
  }

  const session = adapter.store.openSession(adapter.database)

  try {
    // process each document
    for (const doc of docs) {
      // process each relationship field
      for (const field of relationshipFields) {
        const fieldValue = doc[field.name]

        if (!fieldValue) {
          continue
        }

        // handle hasMany relationships (arrays)
        if ('hasMany' in field && (field as any).hasMany && Array.isArray(fieldValue)) {
          const populatedValues = []

          for (const item of fieldValue) {
            // if it's already an object, skip
            if (typeof item === 'object' && item !== null) {
              populatedValues.push(item)
              continue
            }

            // load the related document
            const relatedDoc = await loadRelatedDocument({
              adapter,
              field,
              id: item,
              session,
            })

            if (relatedDoc) {
              populatedValues.push(relatedDoc)
            } else {
              // keep the ID if we can't load the document
              populatedValues.push(item)
            }
          }

          doc[field.name] = populatedValues
        } else {
          // single relationship
          // if it's already an object, skip
          if (typeof fieldValue === 'object' && fieldValue !== null) {
            continue
          }

          // load the related document
          const relatedDoc = await loadRelatedDocument({
            adapter,
            field,
            id: fieldValue,
            session,
          })

          if (relatedDoc) {
            doc[field.name] = relatedDoc
          }
          // else keep the ID
        }
      }
    }
  } finally {
    session.dispose()
  }
}

async function loadRelatedDocument({
  adapter,
  field,
  id,
  session,
}: {
  adapter: RavenDBAdapter
  field: FlattenedField
  id: any
  session: any
}): Promise<Record<string, unknown> | null> {
  try {
    // determine which collection to load from
    let relationTo: string

    if (field.type === 'upload') {
      relationTo = field.relationTo
    } else if (field.type === 'relationship') {
      // handle polymorphic relationships
      if (Array.isArray(field.relationTo)) {
        // for polymorphic, we need to check which collection the ID belongs to
        // for now, try each collection until we find it
        for (const collection of field.relationTo) {
          const collectionName = getCollectionName(collection)
          const fullId = `${collectionName}/${id}`

          try {
            const doc = await session.load(fullId)
            if (doc) {
              // transform the document
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
            // try next collection
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

    // load the document
    const collectionName = getCollectionName(relationTo)
    const fullId = `${collectionName}/${id}`

    const doc = await session.load(fullId)

    if (doc) {
      // transform the document
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
    // if we can't load the document, return null
    return null
  }
}

