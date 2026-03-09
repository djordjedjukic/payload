import { buildVersionCollectionFields, type CountVersions } from 'payload'

import type { RavenDBAdapter } from './types.js'

import { getSession } from './utilities/getSession.js'
import { filterVersionDocs, loadVersionDocs } from './utilities/versionDocuments.js'

export const countVersions: CountVersions = async function countVersions(
  this: RavenDBAdapter,
  { collection: collectionSlug, locale, req, where = {} },
) {
  let session = await getSession(this, req)
  const shouldCloseSession = !session

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    const collectionConfig = this.payload.collections[collectionSlug].config
    const versionFields = buildVersionCollectionFields(this.payload.config, collectionConfig, true)

    const docs = await filterVersionDocs({
      adapter: this,
      collectionSlug,
      docs: await loadVersionDocs({ collectionSlug, session }),
      fields: versionFields,
      locale,
      where,
    })

    const totalDocs = docs.length

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
