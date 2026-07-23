export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await clearUserSession(event)
  return { ok: true }
})
