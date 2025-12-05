import type { Destroy } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const destroy: Destroy = async function destroy(this: RavenDBAdapter) {
  try {
    // dispose all active sessions
    Object.values(this.sessions).forEach(sessionWrapper => {
      if (sessionWrapper) {
        sessionWrapper.db.dispose()
      }
    })

    // clear sessions
    this.sessions = {}

    // don't dispose the document store in dev mode (hot reload)
    // only dispose in production or when explicitly shutting down
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && this.store) {
      this.store.dispose()
      this.payload.logger.info('RavenDB connection closed')
    } else if (isDev) {
      this.payload.logger.info('RavenDB sessions cleared (dev mode - store kept alive)')
    }
  } catch (err) {
    this.payload.logger.error({
      err,
      msg: 'Error closing RavenDB connection',
    })
  }
}

