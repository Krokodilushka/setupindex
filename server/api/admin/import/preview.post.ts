export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const batch = parseImportBatch(await readBody(event))
  return previewImport(event, batch)
})
