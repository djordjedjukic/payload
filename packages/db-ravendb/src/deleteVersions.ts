import type { DeleteVersions } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'

export const deleteVersions: DeleteVersions = async function deleteVersions(
  this: RavenDBAdapter,
  { collection: collectionSlug, locale: _locale, req, where: _where },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionName = getCollectionName(`${collectionSlug}_versions`)

    const query = session.query({ collection: collectionName })

    const docs = await query.all()

    for (const doc of docs) {
      const id = doc?.['@metadata']?.['@id']

      if (typeof id === 'string') {
        await session.delete(id)
      }
    }

    if (shouldCloseSession) {
      await session.saveChanges()
      session.dispose()
    }
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    throw error
  }
}
