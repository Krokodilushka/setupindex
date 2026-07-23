import { and, eq } from 'drizzle-orm'
import { creatorRecords } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const batch = parseImportBatch(body?.batch)

  if (!verifyImportSignature(event, batch, body?.signature)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Import preview is missing or no longer matches this file',
    })
  }

  const preview = await previewImport(event, batch)
  if (!preview.valid) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Database changed after import preview',
      data: preview,
    })
  }

  const operations = await Promise.all(batch.operations.map(async operation => ({
    ...operation,
    document: await persistCreatorAvatar(event, operation.document),
  })))
  const db = await useAppDatabase()
  const now = new Date().toISOString()

  db.transaction((tx) => {
    for (const operation of operations) {
      const document = operation.document

      if (operation.action === 'create') {
        tx.insert(creatorRecords).values({
          slug: document.slug,
          document,
          featured: document.featured,
          createdAt: now,
          updatedAt: now,
        }).run()
        continue
      }

      const result = tx
        .update(creatorRecords)
        .set({
          document,
          featured: document.featured,
          version: operation.expectedVersion + 1,
          updatedAt: now,
        })
        .where(and(
          eq(creatorRecords.slug, operation.slug),
          eq(creatorRecords.version, operation.expectedVersion),
        ))
        .run()

      if (result.changes !== 1)
        tx.rollback()
    }
  })

  return {
    ok: true,
    applied: batch.operations.length,
  }
})
