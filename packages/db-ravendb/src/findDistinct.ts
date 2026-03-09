import type { FindDistinct } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'

export const findDistinct: FindDistinct = async function findDistinct(
  this: RavenDBAdapter,
  { collection: collectionSlug, field, locale, req, where = {} },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(collectionSlug)

    const query = session.query({ collection: collectionName })

    // TODO: apply where conditions

    const docs = await query.all()

    if (shouldCloseSession) {
      session.dispose()
    }

    // extract distinct values for the field
    const values = new Set()
    docs.forEach((doc) => {
      if (doc[field] !== undefined) {
        values.add(doc[field])
      }
    })

    return Array.from(values) as any
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}
