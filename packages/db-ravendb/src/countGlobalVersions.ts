import type { CountGlobalVersions } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'

export const countGlobalVersions: CountGlobalVersions = async function countGlobalVersions(
  this: RavenDBAdapter,
  { global: globalSlug, locale, req, where = {} },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const query = session.query({ collection: 'globals_versions' })
      .whereStartsWith('@id', `globals_versions/${globalSlug}/`)

    const totalDocs = await query.count()

    if (shouldCloseSession) {
      session.dispose()
    }

    return {
      totalDocs,
    }
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}

