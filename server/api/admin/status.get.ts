export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  return {
    configured: await isAdminConfigured(),
    authenticated: session.user?.id === 'admin',
    devMode: import.meta.dev,
  }
})
