import type { Connect } from 'payload'

import type { RavenDBAdapter } from './types.js'

export const connect: Connect = async function connect(
  this: RavenDBAdapter,
  options = {
    hotReload: false,
  },
) {
  const { hotReload } = options

  try {
    if (!this.store) {
      throw new Error('Error: RavenDB DocumentStore not initialized.')
    }

    // initialize the document store if not already initialized
    // RavenDB's DocumentStore.initialize() is idempotent
    this.store.initialize()

    // ensure database exists
    const { CreateDatabaseOperation, GetDatabaseRecordOperation } = await import('ravendb')
    try {
      await this.store.maintenance.server.send(new GetDatabaseRecordOperation(this.database))
    } catch (err: any) {
      if (err.name === 'DatabaseDoesNotExistException') {
        // create database
        this.payload.logger.info(`Creating database: ${this.database}`)
        await this.store.maintenance.server.send(new CreateDatabaseOperation({ databaseName: this.database }))
      } else {
        throw err
      }
    }

    this.payload.logger.info(`Connected to RavenDB database: ${this.database}`)

    if (!hotReload) {
      if (process.env.PAYLOAD_DROP_DATABASE === 'true') {
        this.payload.logger.info('---- DROPPING DATABASE ----')

        try {
          // drop the entire database and recreate it
          const { DeleteDatabasesOperation, CreateDatabaseOperation } = await import('ravendb')

          await this.store.maintenance.server.send(
            new DeleteDatabasesOperation({
              databaseNames: [this.database],
              hardDelete: true,
            })
          )

          // recreate the database
          await this.store.maintenance.server.send(
            new CreateDatabaseOperation({ databaseName: this.database })
          )

          this.payload.logger.info('---- DROPPED DATABASE ----')
        } catch (err: any) {
          // if database doesn't exist, that's fine
          if (err.name !== 'DatabaseDoesNotExistException') {
            throw err
          }
        }
      }
    }

    if (process.env.NODE_ENV === 'production' && this.prodMigrations) {
      await this.migrate({ migrations: this.prodMigrations })
    }
  } catch (err) {
    let msg = `Error: cannot connect to RavenDB.`

    if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string') {
      msg = `${msg} Details: ${err.message}`
    }

    this.payload.logger.error({
      err,
      msg,
    })
    process.exit(1)
  }
}

