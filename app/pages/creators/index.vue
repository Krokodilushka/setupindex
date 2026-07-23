<script setup lang="ts">
// This index file keeps creator detail routes from being treated as nested children.
import type { Creator, CreatorKind } from '../../types/content'
import { localize, safeJsonLd } from '../../utils/content'

const route = useRoute()
const { locale, t } = useI18n()
const config = useRuntimeConfig()
const { data: creatorData } = await useFetch<Creator[]>('/api/creators', {
  default: () => [],
})
const creators = computed(() => creatorData.value)

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedKind = ref<'all' | CreatorKind>('all')
const kindFilters: Array<'all' | CreatorKind> = ['all', 'streamer', 'youtuber', 'esports']

const filteredCreators = computed(() => {
  const query = search.value.trim().toLocaleLowerCase(locale.value === 'ru' ? 'ru-RU' : 'en-US')

  return creators.value.filter((creator) => {
    const matchesKind = selectedKind.value === 'all' || creator.kinds.includes(selectedKind.value)
    const searchable = [
      creator.name,
      ...creator.aliases,
      localize(creator.realName, locale.value),
    ].join(' ').toLocaleLowerCase(locale.value === 'ru' ? 'ru-RU' : 'en-US')

    return matchesKind && (!query || searchable.includes(query))
  })
})

const hasQueryParameters = computed(() => Object.keys(route.query).length > 0)

useSeoMeta({
  title: () => t('catalog.seoTitle'),
  description: () => t('catalog.seoDescription'),
  ogTitle: () => t('catalog.seoTitle'),
  ogDescription: () => t('catalog.seoDescription'),
  ogType: 'website',
  robots: () => hasQueryParameters.value
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large',
})

useHead(() => ({
  script: hasQueryParameters.value
    ? []
    : [
        {
          type: 'application/ld+json',
          innerHTML: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: t('catalog.seoTitle'),
            description: t('catalog.seoDescription'),
            url: `${config.public.siteUrl}${route.path}`,
            inLanguage: locale.value,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: creators.value
                .filter(creator => creator.indexable)
                .map((creator, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: creator.name,
                  url: `${config.public.siteUrl}/${locale.value}/creators/${creator.slug}`,
                })),
            },
          }),
        },
      ],
}))
</script>

<template>
  <div class="page-shell">
    <section class="page-hero section">
      <div class="container">
        <p class="eyebrow">{{ t('catalog.eyebrow') }}</p>
        <h1>{{ t('catalog.title') }}</h1>
        <p class="page-intro">{{ t('catalog.description') }}</p>

        <div class="catalog-toolbar">
          <label class="catalog-search">
            <span class="sr-only">{{ t('common.search') }}</span>
            <span aria-hidden="true">⌕</span>
            <input
              v-model="search"
              type="search"
              :placeholder="t('common.searchPlaceholder')"
              autocomplete="off"
            >
            <button v-if="search" type="button" class="clear-button" @click="search = ''">
              {{ t('common.clear') }}
            </button>
          </label>

          <div class="filter-group" :aria-label="t('catalog.filterLabel')">
            <button
              v-for="kind in kindFilters"
              :key="kind"
              type="button"
              :class="['filter-chip', { 'is-active': selectedKind === kind }]"
              @click="selectedKind = kind"
            >
              {{ kind === 'all' ? t('common.all') : t(`kind.${kind}`) }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-muted catalog-section">
      <div class="container">
        <div class="catalog-meta">
          <strong>{{ t('catalog.results', { count: filteredCreators.length }) }}</strong>
          <p>{{ t('catalog.researchNotice') }}</p>
        </div>

        <div v-if="filteredCreators.length" class="creator-grid">
          <CreatorCard
            v-for="creator in filteredCreators"
            :key="creator.slug"
            :creator="creator"
          />
        </div>

        <div v-else class="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>{{ t('catalog.noResultsTitle') }}</h2>
          <p>{{ t('catalog.noResultsText') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
