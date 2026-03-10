import type { CreateMigration } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const createMigration: CreateMigration = function createMigration(
  this: RavenDBAdapter,
  { migrationName, payload },
) {
  payload.logger.info(`Creating migration: ${migrationName}`)

  // TODO: implement migration file generation
  payload.logger.warn('RavenDB migrations are not fully implemented yet')
}
