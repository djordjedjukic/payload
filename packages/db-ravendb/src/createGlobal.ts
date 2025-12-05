import type { CreateGlobal } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const createGlobal: CreateGlobal = async function createGlobal(
  this: RavenDBAdapter,
  { slug, data, req },
) {
  const globalConfig = this.payload.globals.config.find(config => config.slug === slug)

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    if (!(data as any).createdAt) {
      (data as any).createdAt = new Date().toISOString()
    }

    transform({
      adapter: this,
      data,
      fields: globalConfig.fields,
      operation: 'write',
    })

    const docId = `globals/${slug}`

    await session.store(data, docId)

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    const doc = await session.load(docId)

    if (shouldCloseSession) {
      session.dispose()
    }

    if (!doc) {
      throw new Error('Failed to create global')
    }

    transform({
      adapter: this,
      data: doc,
      fields: globalConfig.fields,
      operation: 'read',
    })

    return doc as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

