import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'https://setupindex.com').replace(/\/$/, '')
const localeCodes = ['en', 'ru'] as const
const staticPaths = ['', '/creators', '/methodology']
const localizedStaticRoutes = localeCodes.flatMap(locale =>
  staticPaths.map(path => `/${locale}${path}`),
)
const nuxtPageUsagePlugin = resolve('node_modules/nuxt/dist/pages/runtime/plugins/check-if-page-unused.js')
const nuxtPageUsagePluginWrapper = resolve('app/nuxt-internal/check-if-page-unused')

export default defineNuxtConfig({
  compatibilityDate: '2026-07-22',
  devtools: { enabled: true },

  alias: {
    '#nuxt-page-usage-plugin': nuxtPageUsagePlugin,
  },

  hooks: {
    // Nuxt 4.5.0 ships this dev-only plugin as `plugin as default`, while its
    // new metadata scanner only recognizes a direct default export (NUXT_B2005).
    // Route it through an explicit default export until Nuxt publishes a fix.
    'app:resolve'(app) {
      const normalizedTarget = nuxtPageUsagePlugin.replaceAll('\\', '/')
      for (const plugin of app.plugins) {
        if (plugin.src.replaceAll('\\', '/') === normalizedTarget)
          plugin.src = nuxtPageUsagePluginWrapper
      }
    },
  },

  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/eslint',
    'nuxt-auth-utils',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    databasePath: process.env.NUXT_DATABASE_PATH || './.data/setupindex.sqlite',
    public: {
      siteUrl,
      yandexMetrikaId: process.env.NUXT_PUBLIC_YANDEX_METRIKA_ID || '',
    },
  },

  auth: {
    webAuthn: true,
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'theme-color', content: '#0b0d10' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  i18n: {
    baseUrl: siteUrl,
    defaultLocale: 'en',
    strategy: 'prefix',
    langDir: 'locales',
    locales: [
      {
        code: 'en',
        name: 'English',
        language: 'en',
        file: 'en.json',
      },
      {
        code: 'ru',
        name: 'Русский',
        language: 'ru',
        file: 'ru.json',
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'setupindex_locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
  },

  site: {
    url: siteUrl,
    name: 'SetupIndex',
    description: 'Verified PCs, gear and streaming setups used by creators and esports players.',
    defaultLocale: 'en',
  },

  sitemap: {
    // `sitemapUrls` already enumerates every indexable route, so auto-discovery is
    // off: it also picked up `/`, which only negotiates a locale and redirects.
    // Exclude globs cannot express that — they match with the locale prefix stripped,
    // so a `/` pattern hits the `/en` home page instead.
    excludeAppSources: true,
    urls: localizedStaticRoutes.map(loc => ({ loc })),
    sources: ['/api/__sitemap__/urls'],
  },

  robots: {
    groups: [
      {
        userAgent: ['*'],
        allow: ['/'],
        disallow: ['/*?q=', '/*?platform=', '/admin', '/*/admin', '/api/admin/'],
      },
    ],
  },

  nitro: {
    preset: 'node-server',
    // Nginx is gone under SSR, so Nitro has to ship pre-compressed assets itself.
    compressPublicAssets: { gzip: true, brotli: true },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    // The locale of `/` depends on the cookie and Accept-Language of each visitor.
    '/': {
      headers: {
        'Cache-Control': 'no-store',
        'Vary': 'Accept-Language, Cookie',
      },
    },
    '/admin': {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
    '/**/admin': {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
    '/api/admin/**': {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: {
      autoInit: false,
    },
  },
})
