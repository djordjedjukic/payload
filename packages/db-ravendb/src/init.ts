import type { Init } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const init: Init = function init(this: RavenDBAdapter) {
  // RavenDB creates collections on write and auto-indexes query patterns,
  // so init only needs to log readiness.
  this.payload.logger.info('RavenDB adapter initialized')
}
