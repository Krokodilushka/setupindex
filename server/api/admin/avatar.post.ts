export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  return {
    url: await storeAvatarData(event, String(body?.slug || ''), body?.imageData),
  }
})
