import type { UpdateGlobal } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const updateGlobal: UpdateGlobal = async function updateGlobal(
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

    const docId = `globals/${slug}`
    let doc = await session.load(docId)

    if (!doc) {
      // create if doesn't exist
      doc = {}
    }

    Object.assign(doc, data)

    transform({
      adapter: this,
      data: doc,
      fields: globalConfig.fields,
      operation: 'write',
    })

    await session.store(doc, docId)

    if (shouldCloseSession) {
      await session.saveChanges()
    }

    const updatedDoc = await session.load(docId)

    if (shouldCloseSession) {
      session.dispose()
    }

    if (!updatedDoc) {
      throw new Error('Failed to update global')
    }

    transform({
      adapter: this,
      data: updatedDoc,
      fields: globalConfig.fields,
      operation: 'read',
    })

    return updatedDoc as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

