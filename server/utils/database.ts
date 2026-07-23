import * as schema from '../database/schema'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { count } from 'drizzle-orm'
import { creators as seedCreators } from '../../app/data/creators'

type AppDatabase = NodeSQLiteDatabase

let database: AppDatabase | undefined
let initialization: Promise<AppDatabase> | undefined

function openDatabase(): AppDatabase {
  const config = useRuntimeConfig()
  const configuredPath = String(config.databasePath)
  const databasePath = configuredPath === ':memory:' ? configuredPath : resolve(configuredPath)

  if (databasePath !== ':memory:')
    mkdirSync(dirname(databasePath), { recursive: true })

  const client = new DatabaseSync(databasePath, {
    timeout: 5_000,
  })
  client.exec('PRAGMA journal_mode = WAL')
  client.exec('PRAGMA foreign_keys = ON')
  client.exec('PRAGMA busy_timeout = 5000')
  client.exec('PRAGMA synchronous = NORMAL')

  const db = drizzle({ client })
  const migrationsFolder = resolve(process.env.NUXT_MIGRATIONS_DIR || './drizzle')
  migrate(db, { migrationsFolder })

  return db
}

async function initializeDatabase(): Promise<AppDatabase> {
  database ||= openDatabase()

  const [result] = await database.select({ count: count() }).from(schema.creatorRecords)
  if ((result?.count || 0) === 0) {
    const now = new Date().toISOString()
    await database.insert(schema.creatorRecords).values(seedCreators.map(creator => ({
      slug: creator.slug,
      document: creator,
      indexable: creator.indexable,
      featured: creator.featured,
      createdAt: now,
      updatedAt: now,
    })))
  }

  return database
}

export function useAppDatabase(): Promise<AppDatabase> {
  initialization ||= initializeDatabase()
  return initialization
}
