import { creators } from './app/data/creators'

const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'https://setupindex.com').replace(/\/$/, '')
const localeCodes = ['en', 'ru'] as const
const staticPaths = ['', '/creators', '/methodology']
const localizedStaticRoutes = localeCodes.flatMap(locale =>
  staticPaths.map(path => `/${locale}${path}`),
)
const excludedCreatorRoutes = localeCodes.flatMap(locale =>
  creators
    .filter(creator => !creator.indexable)
    .map(creator => `/${locale}/creators/${creator.slug}`),
)
const sitemapUrls = [
  ...localizedStaticRoutes.map(loc => ({ loc })),
  ...localeCodes.flatMap(locale =>
    creators
      .filter(creator => creator.indexable)
      .map(creator => ({
        loc: `/${locale}/creators/${creator.slug}`,
        lastmod: creator.updatedAt,
      })),
  ),
]

export default defineNuxtConfig({
  compatibilityDate: '2026-07-22',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      siteUrl,
      yandexMetrikaId: process.env.NUXT_PUBLIC_YANDEX_METRIKA_ID || '',
    },
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
    urls: sitemapUrls,
    exclude: excludedCreatorRoutes,
  },

  robots: {
    groups: [
      {
        userAgent: ['*'],
        allow: ['/'],
        disallow: ['/*?q=', '/*?platform='],
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
