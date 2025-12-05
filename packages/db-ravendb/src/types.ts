import type { DocumentStore, IDocumentSession } from 'ravendb'
import type { BaseDatabaseAdapter, Migration } from 'payload'

export interface RavenDBAdapterArgs {
  /**
   * The URL(s) to your RavenDB server(s)
   */
  url: string | string[]

  /**
   * The name of the database to use
   */
  database: string

  /**
   * Optional certificate for secure connections
   */
  certificate?: Buffer | string

  /**
   * Optional authentication options
   */
  authOptions?: {
    certificate?: Buffer | string
    type?: 'certificate' | 'none'
  }

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
   * Enable this flag if you want to pass your own ID to create operations
   */
  allowIDOnCreate?: boolean
}

export interface RavenDBAdapter extends BaseDatabaseAdapter {
  store: DocumentStore
  database: string
  sessions: {
    [id: string]: {
      db: IDocumentSession
      reject: () => Promise<void>
      resolve: () => Promise<void>
    }
  }
  transactionOptions: false | Record<string, unknown>
  prodMigrations?: Migration[]
  resolveRelationships?: (args: any) => Promise<void>
}

export interface MigrateUpArgs {
  payload: any
  req?: any
}

export interface MigrateDownArgs {
  payload: any
  req?: any
}

