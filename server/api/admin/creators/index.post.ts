import { creatorRecords } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const document = await persistCreatorAvatar(
    event,
    parseCreatorDocument(await readBody(event)),
  )

  if (await findStoredCreator(document.slug)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Creator "${document.slug}" already exists`,
    })
  }

  const db = await useAppDatabase()
  const now = new Date().toISOString()
  await db.insert(creatorRecords).values({
    slug: document.slug,
    document,
    featured: document.featured,
    createdAt: now,
    updatedAt: now,
  })

  return {
    document,
    version: 1,
  }
})
