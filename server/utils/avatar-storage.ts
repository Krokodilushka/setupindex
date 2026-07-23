import type { Creator } from '../../app/types/content'
import type { H3Event } from 'h3'
import { createHash } from 'node:crypto'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const avatarDataPattern = /^data:image\/webp;base64,([A-Za-z0-9+/]+=*)$/
const avatarFilenamePattern = /^[a-z0-9][a-z0-9-]*-[a-f0-9]{16}\.webp$/
const maxAvatarBytes = 1024 * 1024

function avatarDirectory(event: H3Event): string {
  return resolve(String(useRuntimeConfig(event).uploadsPath), 'avatars')
}

export function avatarFilePath(event: H3Event, filename: string): string {
  if (!avatarFilenamePattern.test(filename)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Avatar not found',
    })
  }

  return resolve(avatarDirectory(event), filename)
}

export async function storeAvatarData(event: H3Event, slug: string, imageData: unknown): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'A valid creator slug is required',
    })
  }

  const match = typeof imageData === 'string' ? imageData.match(avatarDataPattern) : null
  if (!match) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Avatar must be a WebP data URL',
    })
  }

  const buffer = Buffer.from(match[1]!, 'base64')
  const isWebP = buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'

  if (!isWebP || buffer.length > maxAvatarBytes) {
    throw createError({
      statusCode: 422,
      statusMessage: isWebP ? 'Avatar must be smaller than 1 MB' : 'Avatar is not a valid WebP image',
    })
  }

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
  const filename = `${slug}-${hash}.webp`
  const directory = avatarDirectory(event)
  await mkdir(directory, { recursive: true })

  const path = avatarFilePath(event, filename)
  try {
    await stat(path)
  }
  catch {
    await writeFile(path, buffer, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST')
        throw error
    })
  }

  return `/uploads/avatars/${filename}`
}

export async function persistCreatorAvatar(event: H3Event, document: Creator): Promise<Creator> {
  if (!document.avatarUrl?.startsWith('data:image/webp;base64,'))
    return document

  return {
    ...document,
    avatarUrl: await storeAvatarData(event, document.slug, document.avatarUrl),
  }
}
