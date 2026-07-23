import type { Creator } from '../../app/types/content'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const creatorRecords = sqliteTable('creators', {
  id: integer().primaryKey({ autoIncrement: true }),
  slug: text().notNull().unique(),
  document: text({ mode: 'json' }).$type<Creator>().notNull(),
  featured: integer({ mode: 'boolean' }).notNull(),
  version: integer().notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const webauthnCredentials = sqliteTable('webauthn_credentials', {
  id: text().primaryKey(),
  ownerKey: text('owner_key').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer().notNull(),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
  transports: text({ mode: 'json' }).$type<AuthenticatorTransportFuture[]>().notNull(),
  aaguid: text(),
  createdAt: text('created_at').notNull(),
})
