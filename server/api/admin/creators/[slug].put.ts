import { and, eq } from 'drizzle-orm'
import { creatorRecords } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const currentSlug = getRouterParam(event, 'slug')
  const body = await readBody(event)
  const expectedVersion = Number(body?.expectedVersion)
  const document = await persistCreatorAvatar(
    event,
    parseCreatorDocument(body?.document),
  )

  if (!currentSlug || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid slug and expectedVersion are required',
    })
  }

  const db = await useAppDatabase()
  const existing = await findStoredCreator(currentSlug)
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Creator not found',
    })
  }
  if (existing.version !== expectedVersion) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Creator was changed after it was opened',
    })
  }

  if (document.slug !== currentSlug && await findStoredCreator(document.slug)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Creator "${document.slug}" already exists`,
    })
  }

  const nextVersion = expectedVersion + 1
  const result = await db
    .update(creatorRecords)
    .set({
      slug: document.slug,
      document,
      featured: document.featured,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(creatorRecords.slug, currentSlug),
      eq(creatorRecords.version, expectedVersion),
    ))

  if (result.changes !== 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Creator was changed while saving',
    })
  }

  return {
    document,
    version: nextVersion,
  }
})
