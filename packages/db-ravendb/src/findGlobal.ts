import type { FindGlobal } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { transform } from './utilities/transform.js'

export const findGlobal: FindGlobal = async function findGlobal(
  this: RavenDBAdapter,
  { slug, locale, req },
) {
  const globalConfig = this.payload.globals.config.find(config => config.slug === slug)

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const docId = `globals/${slug}`
    const doc = await session.load(docId)

    if (shouldCloseSession) {
      session.dispose()
    }

    if (!doc) {
      return null
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

