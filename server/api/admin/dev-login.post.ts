export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  requireSameOrigin(event)
  await setUserSession(event, {
    user: { id: 'admin' },
    loggedInAt: Date.now(),
  })

  return { ok: true }
})
