import type { Init } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const init: Init = function init(this: RavenDBAdapter) {
  // RavenDB is schema-less, so we don't need to create collections or schemas
  // The collections will be created automatically when documents are inserted
  
  this.payload.logger.info('RavenDB adapter initialized')
  
  // we can optionally create indexes here in the future
  // for now, RavenDB will auto-index based on queries
}

