import type { BaseDatabaseAdapter, Migration } from 'payload'
import type { DocumentStore, IDocumentSession } from 'ravendb'

export interface RavenDBAdapterArgs {
  /**
   * Enable this flag if you want to pass your own ID to create operations
   */
  allowIDOnCreate?: boolean

  /**
   * Optional authentication options
   */
  authOptions?: {
    certificate?: Buffer | string
    type?: 'certificate' | 'none'
  }

  /**
   * Optional certificate for secure connections
   */
  certificate?: Buffer | string

  /**
   * The name of the database to use
   */
  database: string

  /**
   * Migration directory path
   */
  migrationDir?: string

  /**
   * Production migrations
   */
  prodMigrations?: Migration[]

  /**
   * Transaction options
   */
  transactionOptions?: false | Record<string, unknown>

  /**
   * The URL(s) to your RavenDB server(s)
   */
  url: string | string[]
}

export interface RavenDBAdapter extends BaseDatabaseAdapter {
  database: string
  prodMigrations?: Migration[]
  resolveRelationships?: (args: any) => Promise<void>
  sessions: {
    [id: string]: {
      db: IDocumentSession
      reject: () => Promise<void>
      resolve: () => Promise<void>
    }
  }
  store: DocumentStore
  transactionOptions: false | Record<string, unknown>
}

export interface MigrateUpArgs {
  payload: any
  req?: any
}

export interface MigrateDownArgs {
  payload: any
  req?: any
}
