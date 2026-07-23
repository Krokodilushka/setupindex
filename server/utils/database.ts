import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'

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
  return database
}

export function useAppDatabase(): Promise<AppDatabase> {
  initialization ||= initializeDatabase()
  return initialization
}
