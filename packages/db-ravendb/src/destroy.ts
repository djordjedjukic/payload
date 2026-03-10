import type { Destroy } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const destroy: Destroy = function destroy(this: RavenDBAdapter) {
  try {
    Object.values(this.sessions).forEach((sessionWrapper) => {
      if (sessionWrapper) {
        sessionWrapper.db.dispose()
      }
    })
    this.sessions = {}

    // Keep the store alive in development so hot reload does not thrash the shared connection.
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

  return Promise.resolve()
}
