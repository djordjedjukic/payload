import type { Field, FlattenedField } from 'payload'

import type { RavenDBAdapter } from '../types.js'

interface TransformArgs {
  adapter: RavenDBAdapter
  data: Record<string, unknown> | object
  fields: Field[] | FlattenedField[]
  operation: 'read' | 'write'
}

/**
 * Transform data between Payload and RavenDB formats
 */
export function transform({ adapter, data, fields, operation }: TransformArgs): void {
  const doc = data as any

  if (operation === 'write') {
    // transform Payload data to RavenDB format
    if (doc.id && !doc['@metadata']) {
      // RavenDB uses @metadata for document metadata
      // we'll store the id in the document itself
    }

    // add updatedAt timestamp
    if (!doc.updatedAt) {
      doc.updatedAt = new Date().toISOString()
    }
  } else if (operation === 'read') {
    // transform RavenDB data to Payload format
    // RavenDB stores the document ID in @metadata['@id']
    // we need to extract it to the id field
    if (doc['@metadata'] && doc['@metadata']['@id']) {
      const fullId = doc['@metadata']['@id'] as string
      // extract just the ID part (after the collection name and /)
      const parts = fullId.split('/')
      if (parts.length > 1) {
        doc.id = parts[parts.length - 1]
      } else {
        doc.id = fullId
      }

      // clean up metadata from the result
      delete doc['@metadata']
    }
  }
}

