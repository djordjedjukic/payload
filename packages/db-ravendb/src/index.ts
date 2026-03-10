import type { DatabaseAdapterObj, Payload } from 'payload'

import fs from 'fs'
import path from 'path'
import { createDatabaseAdapter, defaultBeginTransaction } from 'payload'
import { DocumentStore } from 'ravendb'

import type { RavenDBAdapter, RavenDBAdapterArgs } from './types.js'

import { connect } from './connect.js'
import { count } from './count.js'
import { countGlobalVersions } from './countGlobalVersions.js'
import { countVersions } from './countVersions.js'
import { create } from './create.js'
import { createGlobal } from './createGlobal.js'
import { createGlobalVersion } from './createGlobalVersion.js'
import { createMigration } from './createMigration.js'
import { createVersion } from './createVersion.js'
import { deleteMany } from './deleteMany.js'
import { deleteOne } from './deleteOne.js'
import { deleteVersions } from './deleteVersions.js'
import { destroy } from './destroy.js'
import { find } from './find.js'
import { findDistinct } from './findDistinct.js'
import { findGlobal } from './findGlobal.js'
import { findGlobalVersions } from './findGlobalVersions.js'
import { findOne } from './findOne.js'
import { findVersions } from './findVersions.js'
import { init } from './init.js'
import { queryDrafts } from './queryDrafts.js'
import { beginTransaction } from './transactions/beginTransaction.js'
import { commitTransaction } from './transactions/commitTransaction.js'
import { rollbackTransaction } from './transactions/rollbackTransaction.js'
import { updateGlobal } from './updateGlobal.js'
import { updateGlobalVersion } from './updateGlobalVersion.js'
import { updateMany } from './updateMany.js'
import { updateOne } from './updateOne.js'
import { updateVersion } from './updateVersion.js'
import { resolveRelationships } from './utilities/resolveRelationships.js'

export type { RavenDBAdapter, RavenDBAdapterArgs } from './types.js'

declare module 'payload' {
  export interface DatabaseAdapter extends RavenDBAdapter {}
}

export function ravendbAdapter({
  allowIDOnCreate = false,
  authOptions,
  certificate,
  database,
  migrationDir: migrationDirArg,
  prodMigrations,
  transactionOptions = {},
  url,
}: RavenDBAdapterArgs): DatabaseAdapterObj {
  function adapter({ payload }: { payload: Payload }) {
    const migrationDir = findMigrationDir(migrationDirArg)

    const store = Array.isArray(url)
      ? new DocumentStore(url, database)
      : new DocumentStore(url, database)

    if (certificate || authOptions?.certificate) {
      const cert = certificate || authOptions?.certificate
      if (cert) {
        // @ts-expect-error - certificate property exists but not in types
        store.certificate = typeof cert === 'string' ? Buffer.from(cert) : cert
      }
    }

    return createDatabaseAdapter<RavenDBAdapter>({
      name: 'ravendb',
      allowIDOnCreate,
      beginTransaction: transactionOptions === false ? defaultBeginTransaction() : beginTransaction,
      commitTransaction,
      connect,
      count,
      countGlobalVersions,
      countVersions,
      create,
      createGlobal,
      createGlobalVersion,
      createMigration,
      createVersion,
      database,
      defaultIDType: 'text',
      deleteMany,
      deleteOne,
      deleteVersions,
      destroy,
      find,
      findDistinct,
      findGlobal,
      findGlobalVersions,
      findOne,
      findVersions,
      init,
      migrationDir,
      packageName: '@payloadcms/db-ravendb',
      payload,
      prodMigrations,
      queryDrafts,
      resolveRelationships,
      rollbackTransaction,
      sessions: {},
      store,
      transactionOptions: transactionOptions === false ? false : transactionOptions,
      updateGlobal,
      updateGlobalVersion,
      updateMany,
      updateOne,
      updateVersion,
      upsert: updateOne,
    })
  }

  return {
    name: 'ravendb',
    allowIDOnCreate,
    defaultIDType: 'text',
    init: adapter,
  }
}

function findMigrationDir(migrationDir?: string): string {
  const cwd = process.cwd()
  const srcDir = path.resolve(cwd, 'src/migrations')
  const distDir = path.resolve(cwd, 'dist/migrations')
  const relativeMigrations = path.resolve(cwd, 'migrations')

  if (migrationDir) {
    return migrationDir
  }

  if (fs.existsSync(srcDir)) {
    return srcDir
  }

  if (fs.existsSync(distDir)) {
    return distDir
  }

  if (fs.existsSync(relativeMigrations)) {
    return relativeMigrations
  }

  return srcDir
}
