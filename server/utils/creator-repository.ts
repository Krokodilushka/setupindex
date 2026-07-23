import type { Creator } from '../../app/types/content'
import { asc, eq } from 'drizzle-orm'
import { withCreatorAccent } from '../../shared/utils/creator-accent'
import { creatorRecords } from '../database/schema'

export interface StoredCreator {
  document: Creator
  version: number
}

export async function listStoredCreators(): Promise<StoredCreator[]> {
  const db = await useAppDatabase()
  const creators = await db
    .select({
      document: creatorRecords.document,
      version: creatorRecords.version,
    })
    .from(creatorRecords)
    .orderBy(asc(creatorRecords.id))

  return creators.map(creator => ({
    ...creator,
    document: withCreatorAccent(creator.document),
  }))
}

export async function findStoredCreator(slug: string): Promise<StoredCreator | undefined> {
  const db = await useAppDatabase()
  const [creator] = await db
    .select({
      document: creatorRecords.document,
      version: creatorRecords.version,
    })
    .from(creatorRecords)
    .where(eq(creatorRecords.slug, slug))
    .limit(1)

  return creator
    ? {
        ...creator,
        document: withCreatorAccent(creator.document),
      }
    : undefined
}
