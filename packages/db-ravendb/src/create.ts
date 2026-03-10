import type { Create } from 'payload'

import { v4 as uuid } from 'uuid'

import type { RavenDBAdapter } from './types.js'

import { getCollectionName } from './utilities/getCollectionName.js'
import { getSession } from './utilities/getSession.js'
import { handleError } from './utilities/handleError.js'
import { transform } from './utilities/transform.js'

export const create: Create = async function create(
  this: RavenDBAdapter,
  { collection: collectionSlug, data, req, returning },
) {
  const collectionConfig = this.payload.collections[collectionSlug].config

  let session = await getSession(this, req)
  const shouldCloseSession = !session

  console.log(
    '[RavenDB] create - shouldCloseSession:',
    shouldCloseSession,
    'hasSession:',
    !!session,
    'transactionID:',
    req?.transactionID,
  )

  try {
    if (!session) {
      session = this.store.openSession(this.database)
    }

    if (!data.createdAt) {
      data.createdAt = new Date().toISOString()
    }

    transform({
      adapter: this,
      data,
      fields: collectionConfig.fields,
      operation: 'write',
    })
    let docId = data.id as string
    if (!docId) {
      if (this.allowIDOnCreate && data.id) {
        docId = data.id as string
      } else {
        docId = uuid()
      }
    }
    data.id = docId

    const collectionName = getCollectionName(collectionSlug)
    const fullId = `${collectionName}/${docId}`

    console.log('[RavenDB] Creating document:', {
      collectionName,
      collectionSlug,
      fullId,
      hasData: !!data,
    })
    if (!data['@metadata']) {
      data['@metadata'] = {}
    }
    data['@metadata']['@collection'] = collectionName
    data['@metadata']['Raven-Node-Type'] = collectionName
    await session.store(data, fullId)

    console.log('[RavenDB] Document stored, saving changes...')

    // Persist immediately so follow-up reads in the same request flow can see the new document.
    await session.saveChanges()
    console.log('[RavenDB] Changes saved successfully')
    if (shouldCloseSession) {
      session.dispose()
    }

    if (returning === false) {
      return null
    }
    transform({
      adapter: this,
      data,
      fields: collectionConfig.fields,
      operation: 'read',
    })

    return data
  } catch (error) {
    if (shouldCloseSession && session) {
      session.dispose()
    }
    handleError({ collection: collectionSlug, error, req })
  }
}
