import { createVersion } from './createVersion.js'
import { findVersions } from './findVersions.js'
import { queryDrafts } from './queryDrafts.js'
import { updateVersion } from './updateVersion.js'
import type { RavenDBAdapter } from './types.js'

class FakeQuery {
  private filters: Array<(doc: any) => boolean> = []
  private skipCount = 0
  private sortField?: string
  private takeCount?: number
  constructor(
    private docs: Map<string, any>,
    private collection: string,
    private descending = false,
  ) {}
  all = async () => this.materialize()
  count = async () => this.materialize().length
  orderBy = (path: string) => ((this.sortField = path), (this.descending = false), this)
  orderByDescending = (path: string) => ((this.sortField = path), (this.descending = true), this)
  skip = (count: number) => ((this.skipCount = count), this)
  take = (count: number) => ((this.takeCount = count), this)
  waitForNonStaleResults = () => this
  whereEquals = (path: string, value: unknown) => (
    this.filters.push((doc) => this.getValue(doc, path) === value), this
  )
  private getValue(doc: any, path: string) {
    return path.split('.').reduce((value, key) => value?.[key], doc)
  }
  private materialize() {
    if (this.collection.endsWith('_versions')) {
      return []
    }

    let rows = Array.from(this.docs.entries())
      .filter(([id]) => id.startsWith(`${this.collection}/`))
      .map(([, doc]) => doc)
      .filter((doc) => this.filters.every((filter) => filter(doc)))

    if (this.sortField) {
      rows = rows.sort((left, right) => {
        const a = this.getValue(left, this.sortField!)
        const b = this.getValue(right, this.sortField!)
        const result = a === b ? 0 : a > b ? 1 : -1
        return this.descending ? -result : result
      })
    }

    if (this.skipCount) {
      rows = rows.slice(this.skipCount)
    }

    if (typeof this.takeCount === 'number') {
      rows = rows.slice(0, this.takeCount)
    }

    return rows
  }
}

class FakeSession {
  docs = new Map<string, any>()
  lastStoredDoc: any
  saveChangesCalls = 0
  constructor(seed: Record<string, any> = {}) {
    for (const [id, doc] of Object.entries(seed)) {
      this.docs.set(id, { ...doc, '@metadata': { '@id': id } })
    }
  }
  dispose = jest.fn()
  load = async (id: string) => this.docs.get(id) ?? null
  loadStartingWith = async (idPrefix: string, opts?: { pageSize?: number; start?: number }) => {
    const start = opts?.start ?? 0
    const pageSize = opts?.pageSize ?? Number.MAX_SAFE_INTEGER

    return Array.from(this.docs.entries())
      .filter(([id]) => id.startsWith(idPrefix))
      .map(([, doc]) => doc)
      .slice(start, start + pageSize)
  }
  query = ({ collection }: { collection: string }) => new FakeQuery(this.docs, collection)
  saveChanges = async () => {
    this.saveChangesCalls += 1
  }
  store = async (doc: any, id: string) => {
    this.lastStoredDoc = doc
    this.docs.set(id, {
      ...doc,
      '@metadata': { ...(doc['@metadata'] || {}), '@id': id },
    })
  }
}

const buildAdapter = (session: FakeSession) => {
  const collectionConfig = {
    fields: [{ name: 'title', type: 'text' }],
    flattenedFields: [{ name: 'title', type: 'text' }],
    slug: 'pages',
    versions: { drafts: true },
  }

  return {
    database: 'test',
    payload: {
      collections: {
        pages: { config: collectionConfig },
      },
      config: {},
    },
    sessions: {
      tx1: {
        db: session,
      },
    },
    store: {
      openSession: jest.fn(() => session),
    },
  } as unknown as RavenDBAdapter
}

describe('RavenDB versions', () => {
  it('persists collection versions immediately and stores the version payload', async () => {
    const session = new FakeSession({
      'Pages_versions/older-version': {
        latest: true,
        parent: 'Pages/page-1',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: { title: 'Old title' },
      },
    })
    const adapter = buildAdapter(session)

    const result = await createVersion.call(adapter, {
      autosave: false,
      collectionSlug: 'pages',
      createdAt: '2024-01-02T00:00:00.000Z',
      parent: 'page-1',
      req: { locale: 'en', transactionID: 'tx1' } as any,
      updatedAt: '2024-01-02T00:00:00.000Z',
      versionData: { title: 'New title' } as any,
    })

    const storedDoc = Array.from(session.docs.values()).find(
      (doc) => doc.version?.title === 'New title',
    )

    expect(session.saveChangesCalls).toBe(1)
    expect(storedDoc?.latest).toBe(true)
    expect(storedDoc?.version).toEqual({ title: 'New title' })
    expect(session.lastStoredDoc?.['@metadata']?.['@collection']).toBe('Pages_versions')
    expect(session.docs.get('Pages_versions/older-version')?.latest).toBe(false)
    expect(result.id).toBeDefined()
    expect(result.id).not.toContain('/')
  })

  it('filters and normalizes version results', async () => {
    const session = new FakeSession({
      'Pages_versions/version-1': {
        latest: true,
        parent: 'Pages/page-1',
        updatedAt: '2024-01-03T00:00:00.000Z',
        version: { title: 'Visible' },
      },
      'Pages_versions/version-2': {
        latest: true,
        parent: 'page-2',
        updatedAt: '2024-01-02T00:00:00.000Z',
        version: { title: 'Hidden' },
      },
    })
    const adapter = buildAdapter(session)

    const result = await findVersions.call(adapter, {
      collection: 'pages',
      limit: 10,
      locale: 'en',
      pagination: false,
      req: { locale: 'en', transactionID: 'tx1' } as any,
      sort: '-updatedAt',
      where: { parent: { equals: 'page-1' } },
    })

    expect(result.totalDocs).toBe(1)
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0].id).toBe('version-1')
  })

  it('queries drafts from version docs even when Raven collection queries are empty', async () => {
    const session = new FakeSession({
      'Pages_versions/version-1': {
        latest: true,
        parent: 'Pages/page-1',
        updatedAt: '2024-01-02T00:00:00.000Z',
        version: { title: 'Older visible' },
      },
      'Pages_versions/version-2': {
        latest: true,
        parent: 'Pages/page-1',
        updatedAt: '2024-01-03T00:00:00.000Z',
        version: { title: 'Visible' },
      },
      'Pages_versions/version-3': {
        latest: false,
        parent: 'Pages/page-2',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: { title: 'Hidden' },
      },
    })
    const adapter = buildAdapter(session)

    const result = await queryDrafts.call(adapter, {
      collection: 'pages',
      limit: 10,
      locale: 'en',
      pagination: false,
      req: { locale: 'en', transactionID: 'tx1' } as any,
      sort: '-updatedAt',
    })

    expect(result.totalDocs).toBe(1)
    expect(result.docs).toEqual([{ id: 'page-1', title: 'Visible' }])
  })

  it('updates versions using normalized ids and saves shared sessions', async () => {
    const session = new FakeSession({
      'Pages_versions/version-1': {
        latest: true,
        parent: 'page-1',
        updatedAt: '2024-01-03T00:00:00.000Z',
        version: { title: 'Before' },
      },
    })
    const adapter = buildAdapter(session)

    const result = await updateVersion.call(adapter, {
      collection: 'pages',
      id: 'Pages_versions/version-1',
      req: { transactionID: 'tx1' } as any,
      versionData: {
        latest: true,
        parent: 'page-1',
        updatedAt: '2024-01-04T00:00:00.000Z',
        version: { title: 'After' },
      } as any,
    })

    expect(session.saveChangesCalls).toBe(1)
    expect(result.id).toBe('version-1')
    expect(result.version).toEqual({ title: 'After' })
  })
})
