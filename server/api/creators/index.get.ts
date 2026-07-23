export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-cache')
  const creators = await listStoredCreators()

  return creators.map(creator => creator.document)
})
