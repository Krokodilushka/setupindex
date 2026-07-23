// Consumed by the Docker HEALTHCHECK and the Compose healthcheck.
// Both match the body exactly, so keep the payload as "ok\n".
export default defineEventHandler(async (event) => {
  await useAppDatabase()
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'no-store')

  return 'ok\n'
})
