// Boots the built SSR server and asserts the behavior that only exists at runtime.
// This replaces the coverage previously provided by `nuxt generate --failOnError`.
import { spawn } from 'node:child_process'
import { randomUUID, webcrypto } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { basename, join } from 'node:path'
import { defaults as sessionSealDefaults, seal } from 'iron-webcrypto'

const port = Number(process.env.SMOKE_PORT || 3123)
const origin = `http://127.0.0.1:${port}`
const entry = '.output/server/index.mjs'
const failures = []
const sessionPassword = process.env.NUXT_SESSION_PASSWORD || 'smoke-test-session-password-at-least-32-characters'
const contentImport = JSON.parse(readFileSync('docs/imports/setupindex-creators.json', 'utf8'))
const m0nesyAvatarPath = contentImport.operations.find(operation => operation.document.slug === 'm0nesy').document.avatarUrl
const temporaryUploads = mkdtempSync(join(tmpdir(), 'setupindex-smoke-uploads-'))
mkdirSync(join(temporaryUploads, 'avatars'))
copyFileSync(
  join('docs/imports/avatars', basename(m0nesyAvatarPath)),
  join(temporaryUploads, 'avatars', basename(m0nesyAvatarPath)),
)

if (!existsSync(entry)) {
  console.error(`Missing ${entry}. Run "npm run build" first.`)
  process.exit(1)
}

const server = spawn(process.execPath, [entry], {
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    NITRO_PORT: String(port),
    NUXT_DATABASE_PATH: ':memory:',
    NUXT_UPLOADS_PATH: temporaryUploads,
    NUXT_SESSION_PASSWORD: sessionPassword,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverLog = ''
server.stdout.on('data', chunk => (serverLog += chunk))
server.stderr.on('data', chunk => (serverLog += chunk))

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`)
  }
  else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// Nitro serves a JSON error body unless the client asks for HTML, so every
// request here has to look like a real browser navigation.
const browserAccept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'

function get(path, { headers = {} } = {}) {
  return fetch(`${origin}${path}`, {
    headers: { accept: browserAccept, ...headers },
    redirect: 'manual',
  })
}

function post(path, body, { headers = {} } = {}) {
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin,
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  })
}

async function waitForServer() {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Server exited early with code ${server.exitCode}:\n${serverLog}`)

    try {
      const response = await get('/healthz')
      if (response.ok)
        return
    }
    catch {
      // not listening yet
    }

    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Server did not become healthy in 30s:\n${serverLog}`)
}

async function run() {
  await waitForServer()

  const emptyCreators = await get('/api/creators')
  const emptyCreatorsBody = await emptyCreators.json()
  check('fresh database has no creator seed', emptyCreators.status === 200
    && Array.isArray(emptyCreatorsBody)
    && emptyCreatorsBody.length === 0)

  const now = Date.now()
  const sealedAdminSession = await seal(webcrypto, {
    id: randomUUID(),
    createdAt: now,
    data: {
      user: { id: 'admin' },
      loggedInAt: now,
    },
  }, sessionPassword, sessionSealDefaults)
  const adminCookie = `nuxt-session=${encodeURIComponent(sealedAdminSession)}`
  const importPreviewResponse = await post('/api/admin/import/preview', contentImport, {
    headers: { cookie: adminCookie },
  })
  const importPreview = await importPreviewResponse.json()
  check('portable import previews on a clean database', importPreviewResponse.status === 200
    && importPreview.valid === true
    && typeof importPreview.signature === 'string',
  `${importPreviewResponse.status} ${JSON.stringify(importPreview).slice(0, 600)}`)

  const importApplyResponse = await post('/api/admin/import/apply', {
    batch: contentImport,
    signature: importPreview.signature,
  }, {
    headers: { cookie: adminCookie },
  })
  const importApply = await importApplyResponse.json()
  check('portable import populates the clean database', importApplyResponse.status === 200
    && importApply.ok === true
    && importApply.applied === contentImport.operations.length,
  `${importApplyResponse.status} ${JSON.stringify(importApply).slice(0, 600)}`)

  console.log('\nhealth + headers')
  const health = await get('/healthz')
  check('/healthz returns 200 "ok"', health.status === 200 && (await health.text()) === 'ok\n')

  const page = await get('/en/creators')
  check('security headers on HTML', page.headers.get('x-content-type-options') === 'nosniff'
    && page.headers.get('x-frame-options') === 'SAMEORIGIN'
    && page.headers.get('referrer-policy') === 'strict-origin-when-cross-origin'
    && page.headers.get('permissions-policy') === 'camera=(), microphone=(), geolocation=()',
  [...page.headers].filter(([k]) => k.startsWith('x-') || k.includes('policy')).join('; '))

  console.log('\nlocale negotiation on /')
  const ruBrowser = await get('/', { headers: { 'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8' } })
  check('ru browser -> /ru', ruBrowser.status >= 300 && ruBrowser.status < 400
    && (ruBrowser.headers.get('location') || '').includes('/ru'),
  `${ruBrowser.status} ${ruBrowser.headers.get('location')}`)

  // The old Nginx map matched a bare "ru" substring and sent this visitor to /ru.
  const enFirst = await get('/', { headers: { 'accept-language': 'en-US,en;q=0.9,ru;q=0.8' } })
  check('en-first browser that also accepts ru -> /en', enFirst.status >= 300 && enFirst.status < 400
    && (enFirst.headers.get('location') || '').includes('/en'),
  `${enFirst.status} ${enFirst.headers.get('location')}`)

  const cookie = await get('/', {
    headers: { 'accept-language': 'en-US,en;q=0.9', 'cookie': 'setupindex_locale=ru' },
  })
  check('explicit locale cookie beats Accept-Language', cookie.status >= 300 && cookie.status < 400
    && (cookie.headers.get('location') || '').includes('/ru'),
  `${cookie.status} ${cookie.headers.get('location')}`)

  check('/ carries Vary for caches', (ruBrowser.headers.get('vary') || '').toLowerCase().includes('accept-language'),
    ruBrowser.headers.get('vary'))

  console.log('\npages')
  for (const path of ['/en', '/ru', '/en/creators', '/ru/creators', '/en/methodology', '/ru/methodology']) {
    const response = await get(path)
    const body = response.ok ? await response.text() : ''
    check(`${path} renders`, response.status === 200 && body.includes('SetupIndex'), String(response.status))
  }

  const profile = await get('/en/creators/m0nesy')
  const profileBody = profile.ok ? await profile.text() : ''
  check('creator profile renders with JSON-LD', profile.status === 200
    && profileBody.includes('m0NESY')
    && profileBody.includes('application/ld+json')
    && profileBody.includes('"@type":"ProfilePage"'))
  check('creator profile is indexable', /<meta[^>]+name="robots"[^>]+content="index, follow/.test(profileBody))
  check('server-rendered HTML contains equipment', profileBody.includes('9800X3D'))
  check('equipment source shows its linked domain', profileBody.includes('>Source</p>')
    && profileBody.includes('prosettings.net')
    && profileBody.includes('href="https://prosettings.net/players/m0nesy/"'))

  const avatar = await get(m0nesyAvatarPath)
  const avatarBytes = new Uint8Array(await avatar.arrayBuffer())
  check('local avatar is served from disk', avatar.status === 200
    && avatar.headers.get('content-type') === 'image/webp'
    && new TextDecoder().decode(avatarBytes.slice(0, 4)) === 'RIFF')

  const avatarUpload = await post('/api/admin/avatar', {
    slug: 'smoke-avatar',
    imageData: `data:image/webp;base64,${Buffer.from(avatarBytes).toString('base64')}`,
  }, {
    headers: { cookie: adminCookie },
  })
  const avatarUploadBody = await avatarUpload.json()
  const uploadedAvatar = typeof avatarUploadBody.url === 'string'
    ? await get(avatarUploadBody.url)
    : null
  const uploadedAvatarBytes = uploadedAvatar
    ? new Uint8Array(await uploadedAvatar.arrayBuffer())
    : new Uint8Array()
  check('admin avatar upload writes a WebP file to disk', avatarUpload.status === 200
    && /^\/uploads\/avatars\/smoke-avatar-[a-f0-9]{16}\.webp$/.test(avatarUploadBody.url)
    && uploadedAvatar?.status === 200
    && new TextDecoder().decode(uploadedAvatarBytes.slice(0, 4)) === 'RIFF',
  `${avatarUpload.status} ${JSON.stringify(avatarUploadBody).slice(0, 300)}`)

  console.log('\nadmin')
  const adminRedirect = await get('/admin')
  check('/admin redirects to the localized panel', adminRedirect.status === 302
    && adminRedirect.headers.get('location') === '/ru/admin')

  const adminPage = await get('/ru/admin')
  const adminPageBody = await adminPage.text()
  check('admin setup page renders with noindex', adminPage.status === 200
    && adminPageBody.includes('Создание администратора')
    && /<meta[^>]+name="robots"[^>]+content="noindex, nofollow/.test(adminPageBody)
    && adminPage.headers.get('x-robots-tag') === 'noindex, nofollow')

  const adminCreatorPage = await get('/ru/admin/creators/m0nesy')
  const adminCreatorPageBody = await adminCreatorPage.text()
  check('admin creator editor has a separate protected route', adminCreatorPage.status === 200
    && adminCreatorPageBody.includes('Создание администратора')
    && /<meta[^>]+name="robots"[^>]+content="noindex, nofollow/.test(adminCreatorPageBody)
    && adminCreatorPage.headers.get('x-robots-tag') === 'noindex, nofollow')

  const authenticatedAdminPage = await get('/ru/admin/creators/m0nesy', {
    headers: {
      cookie: adminCookie,
    },
  })
  const authenticatedAdminPageBody = await authenticatedAdminPage.text()
  check('admin session reaches SSR creator data requests', authenticatedAdminPage.status === 200
    && authenticatedAdminPageBody.includes('m0NESY')
    && authenticatedAdminPageBody.includes('Сохранить'),
  `${authenticatedAdminPage.status} ${authenticatedAdminPageBody.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] || 'no heading'}`)

  const adminStatus = await get('/api/admin/status')
  const adminStatusBody = await adminStatus.json()
  check('fresh database allows first passkey setup', adminStatus.status === 200
    && adminStatusBody.configured === false
    && adminStatusBody.authenticated === false
    && adminStatusBody.devMode === false)

  const productionDevLogin = await post('/api/admin/dev-login', {})
  check('passwordless dev login is absent from production', productionDevLogin.status === 404)

  const protectedCreators = await get('/api/admin/creators')
  check('admin data is protected before authentication', protectedCreators.status === 401)

  const registration = await post('/api/admin/webauthn/register', {
    verify: false,
    user: {
      userName: 'setupindex-admin',
      displayName: 'SetupIndex administrator',
    },
  })
  const registrationBody = await registration.json()
  check('first passkey registration options are generated', registration.status === 200
    && typeof registrationBody.attemptId === 'string'
    && typeof registrationBody.creationOptions?.challenge === 'string')

  console.log('\nerrors')
  const missingEn = await get('/en/creators/definitely-not-a-creator')
  const missingEnBody = await missingEn.text()
  check('unknown creator returns 404', missingEn.status === 404, String(missingEn.status))
  check('404 body is localized in English', missingEnBody.includes('This setup is off the desk'))

  const missingRu = await get('/ru/creators/definitely-not-a-creator')
  const missingRuBody = await missingRu.text()
  check('404 body is localized in Russian', missingRu.status === 404
    && missingRuBody.includes('Этот сетап'), missingRuBody.match(/<h1>([^<]*)<\/h1>/)?.[1])

  console.log('\nseo endpoints')
  const robots = await get('/robots.txt')
  const robotsBody = await robots.text()
  check('/robots.txt advertises the sitemap', robots.status === 200 && robotsBody.includes('Sitemap:'))
  check('security headers on /robots.txt', robots.headers.get('x-content-type-options') === 'nosniff')

  const sitemapIndex = await get('/sitemap_index.xml')
  const sitemapIndexBody = await sitemapIndex.text()
  check('/sitemap_index.xml lists locale sitemaps', sitemapIndex.status === 200
    && sitemapIndexBody.includes('<sitemapindex')
    && sitemapIndexBody.includes('/__sitemap__/ru.xml'))

  const enSitemap = await get('/__sitemap__/en.xml')
  const enSitemapBody = await enSitemap.text()
  check('sitemap includes a creator', enSitemapBody.includes('/en/creators/m0nesy'))
  check('sitemap excludes inactive profiles', !enSitemapBody.includes('/en/creators/evelone'))

  for (const locale of ['en', 'ru']) {
    const body = await (await get(`/__sitemap__/${locale}.xml`)).text()
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])

    // `/` redirects, so submitting it would report as "Page with redirect".
    check(`${locale} sitemap omits the redirecting root`, !locs.some(loc => /^https?:\/\/[^/]+\/?$/.test(loc)),
      locs.join(' '))
    check(`${locale} sitemap only lists ${locale} URLs`,
      locs.every(loc => new URL(loc).pathname.startsWith(`/${locale}`)), locs.join(' '))
  }
}

try {
  await run()
}
catch (error) {
  failures.push(error.message)
  console.error(error.message)
}
finally {
  if (server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve))
    server.kill()
    await exited
  }
  rmSync(temporaryUploads, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`\nSmoke test failed (${failures.length}):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('\nSmoke test passed.')
