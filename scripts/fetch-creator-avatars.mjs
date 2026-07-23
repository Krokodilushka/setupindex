import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const outputDirectory = resolve('docs/imports/avatars')
const manifestPath = resolve('docs/imports/avatar-sources.json')
const profiles = {
  m0nesy: 'https://www.twitch.tv/m0nesyof',
  donk: 'https://www.twitch.tv/donk1437',
  nix: 'https://www.twitch.tv/nix',
  kuplinov: 'https://www.youtube.com/@KuplinovPlay',
  buster: 'https://www.twitch.tv/buster',
  marmok: 'https://www.youtube.com/@MrMarmok',
  mrlololoshka: 'https://www.youtube.com/channel/UCAvrIl6ltV8MdJo3mV4Nl4Q',
  bratishkinoff: 'https://www.twitch.tv/bratishkinoff',
  strogo: 'https://www.twitch.tv/strogo',
  recrent: 'https://www.twitch.tv/recrent',
  sasavot: 'https://www.twitch.tv/sasavot',
  papich: 'https://www.youtube.com/channel/UCbt5BCs0aUDgNwRaUnKtXwA',
  s1mple: 'https://www.twitch.tv/s1mple',
  edison: 'https://www.youtube.com/@edisonpts',
  chezee: 'https://www.youtube.com/@chezeeplay',
  derzko69: 'https://www.twitch.tv/derzko69',
  'derzhi-dver': 'https://www.youtube.com/@dergidver',
  deko: 'https://www.twitch.tv/deko',
  jynxzi: 'https://www.twitch.tv/jynxzi',
  xqc: 'https://www.twitch.tv/xqc',
  'typical-gamer': 'https://www.youtube.com/@TypicalGamer',
  shroud: 'https://www.twitch.tv/shroud',
  ninja: 'https://www.twitch.tv/ninja',
  clix: 'https://www.twitch.tv/clix',
  tenz: 'https://www.twitch.tv/tenz',
  tarik: 'https://www.twitch.tv/tarik',
  timthetatman: 'https://www.twitch.tv/timthetatman',
}

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('\\u0026', '&')
}

async function imageUrlFor(profileUrl) {
  const isYouTube = new URL(profileUrl).hostname.endsWith('youtube.com')
  const url = isYouTube
    ? `${profileUrl}${profileUrl.includes('?') ? '&' : '?'}app=desktop&persist_app=1`
    : profileUrl
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en',
      'user-agent': 'Googlebot',
    },
  })
  const html = await response.text()

  if (!response.ok)
    throw new Error(`${profileUrl} returned HTTP ${response.status}`)

  const twitchImage = html.match(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="(?:og:image|twitter:image)"/i)?.[1]
  const youtubeImage = html.match(/https:\/\/yt3\.googleusercontent\.com\/[^"\\]+/)?.[0]
  const imageUrl = decodeHtml(twitchImage || youtubeImage || '')

  if (!imageUrl)
    throw new Error(`Could not find a profile image at ${profileUrl}`)

  return imageUrl
}

await mkdir(outputDirectory, { recursive: true })
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'setupindex-avatars-'))
const manifest = {}

try {
  for (const [slug, profileUrl] of Object.entries(profiles)) {
    const imageUrl = await imageUrlFor(profileUrl)
    const response = await fetch(imageUrl, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    })
    if (!response.ok)
      throw new Error(`${imageUrl} returned HTTP ${response.status}`)

    const sourcePath = join(temporaryDirectory, `${slug}.source`)
    const webpPath = join(temporaryDirectory, `${slug}.webp`)
    await writeFile(sourcePath, Buffer.from(await response.arrayBuffer()))
    await run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      sourcePath,
      '-vf',
      'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '86',
      webpPath,
    ])

    const webp = await readFile(webpPath)
    const hash = createHash('sha256').update(webp).digest('hex').slice(0, 16)
    const filename = `${slug}-${hash}.webp`
    await copyFile(webpPath, join(outputDirectory, filename))
    manifest[slug] = {
      file: filename,
      profileUrl,
      imageUrl,
    }
    console.log(`${slug}: ${filename}`)
  }
}
finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Saved ${Object.keys(manifest).length} avatars and ${manifestPath}`)
