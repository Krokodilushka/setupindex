import type { Creator } from '../../app/types/content'
import { sortSourcesNewestFirst } from '../../app/utils/content'
import { creatorSchema } from '../../app/utils/creator-schema'
import { asc, eq } from 'drizzle-orm'
import { withCreatorAccent } from '../../shared/utils/creator-accent'
import { creatorRecords } from '../database/schema'

export interface StoredCreator {
  document: Creator
  version: number
}

function normalizeStoredCreator(document: unknown): Creator {
  const parsed = creatorSchema.parse(document)
  return withCreatorAccent({
    ...parsed,
    sources: sortSourcesNewestFirst(parsed.sources),
  }) as Creator
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
    document: normalizeStoredCreator(creator.document),
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
        document: normalizeStoredCreator(creator.document),
      }
    : undefined
}
