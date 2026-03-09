import { transform } from './transform.js'
import type { RavenDBAdapter } from '../types.js'

describe('RavenDB transform', () => {
  const adapter = {
    payload: {
      config: {},
    },
  } as RavenDBAdapter

  it('normalizes ids from Raven metadata on read', () => {
    const doc = {
      '@metadata': {
        '@id': 'Pages/abc-123',
      },
      id: 'Pages/abc-123',
    }

    transform({ adapter, data: doc, fields: [], operation: 'read' })

    expect(doc.id).toBe('abc-123')
    expect(doc).not.toHaveProperty('@metadata')
  })

  it('normalizes ids from the document when Raven mutates it before metadata is available', () => {
    const doc = {
      id: 'Pages/abc-123',
    }

    transform({ adapter, data: doc, fields: [], operation: 'read' })

    expect(doc.id).toBe('abc-123')
  })

  it('leaves already normalized ids untouched', () => {
    const doc = {
      id: 'abc-123',
    }

    transform({ adapter, data: doc, fields: [], operation: 'read' })

    expect(doc.id).toBe('abc-123')
  })
})
