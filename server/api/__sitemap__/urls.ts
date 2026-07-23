import type { SitemapUrlInput } from '#sitemap/types'

export default defineSitemapEventHandler(async () => {
  const creators = await listStoredCreators()

  return creators
    .filter(({ document }) => document.indexable)
    .flatMap(({ document }) => ['en', 'ru'].map(locale => ({
      loc: `/${locale}/creators/${document.slug}`,
      lastmod: document.updatedAt,
    }))) satisfies SitemapUrlInput[]
})
