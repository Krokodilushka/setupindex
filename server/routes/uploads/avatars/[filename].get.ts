import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const path = avatarFilePath(event, filename)

  let file
  try {
    file = await stat(path)
  }
  catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Avatar not found',
    })
  }

  if (!file.isFile()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Avatar not found',
    })
  }

  setHeader(event, 'Content-Type', 'image/webp')
  setHeader(event, 'Content-Length', file.size)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(path))
})
