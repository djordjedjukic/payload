import type { BaseDatabaseAdapter, Migration } from 'payload'
import type { DocumentStore, IDocumentSession } from 'ravendb'

export interface RavenDBAdapterArgs {
  allowIDOnCreate?: boolean
  authOptions?: {
    certificate?: Buffer | string
    type?: 'certificate' | 'none'
  }
  certificate?: Buffer | string
  database: string
  migrationDir?: string
  prodMigrations?: Migration[]
  transactionOptions?: false | Record<string, unknown>
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
