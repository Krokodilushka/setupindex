export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-cache')
  const slug = getRouterParam(event, 'slug')
  const creator = slug ? await findStoredCreator(slug) : undefined

  if (!creator) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Creator not found',
    })
  }

  return creator.document
})
