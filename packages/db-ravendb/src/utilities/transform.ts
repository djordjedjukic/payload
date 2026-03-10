import type { Field, FlattenedField } from 'payload'

import type { RavenDBAdapter } from '../types.js'

import { extractIDFromRavenID } from './extractIDFromRavenID.js'

interface TransformArgs {
  adapter: RavenDBAdapter
  data: object | Record<string, unknown>
  fields: Field[] | FlattenedField[]
  operation: 'read' | 'write'
}

export function transform({ adapter, data, fields, operation }: TransformArgs): void {
  const doc = data as any

  if (operation === 'write') {
    if (!doc.updatedAt) {
      doc.updatedAt = new Date().toISOString()
    }
  } else if (operation === 'read') {
    const metadataID = doc['@metadata']?.['@id']

    if (metadataID) {
      doc.id = extractIDFromRavenID(metadataID)
    } else if (doc.id) {
      doc.id = extractIDFromRavenID(doc.id)
    }

    if (doc['@metadata']) {
      delete doc['@metadata']
    }
  }
}
