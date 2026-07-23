<script setup lang="ts">
import type { Creator } from '../types/content'
import { safeJsonLd } from '../utils/content'

const { locale, t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()
const search = ref('')
const { data: creatorData } = await useFetch<Creator[]>('/api/creators', {
  default: () => [],
})
const creators = computed(() => creatorData.value)

const featuredCreators = computed(() => creators.value.filter(creator => creator.featured))
const publishedCount = computed(() => creators.value.filter(creator => creator.sources.length > 0).length)
const equipmentCount = computed(() => creators.value.reduce((total, creator) => total + creator.equipment.length, 0))

function statLabel(key: 'statsProfiles' | 'statsPublished' | 'statsItems', count: number): string {
  const category = new Intl.PluralRules(locale.value === 'ru' ? 'ru-RU' : 'en-US').select(count)
  const form = ['one', 'few', 'many'].includes(category) ? category : 'other'
  return t(`home.${key}.${form}`)
}

function submitSearch() {
  const query = search.value.trim()

  return navigateTo({
    path: localePath('/creators'),
    query: query ? { q: query } : undefined,
  })
}

useSeoMeta({
  title: () => t('home.seoTitle'),
  description: () => t('home.seoDescription'),
  ogTitle: () => t('home.seoTitle'),
  ogDescription: () => t('home.seoDescription'),
  ogType: 'website',
  robots: 'index, follow, max-image-preview:large',
})

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: safeJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${config.public.siteUrl}/#website`,
            url: `${config.public.siteUrl}${route.path}`,
            name: 'SetupIndex',
            description: t('home.seoDescription'),
            inLanguage: locale.value,
          },
          {
            '@type': 'Organization',
            '@id': `${config.public.siteUrl}/#organization`,
            name: 'SetupIndex',
            url: config.public.siteUrl,
            logo: `${config.public.siteUrl}/favicon.svg`,
          },
        ],
      }),
    },
  ],
}))
</script>

<template>
  <div>
    <section class="hero section">
      <div class="hero-grid container">
        <div class="hero-copy">
          <p class="eyebrow">
            <span class="eyebrow-dot" aria-hidden="true" />
            {{ t('home.eyebrow') }}
          </p>
          <h1>
            {{ t('home.titleLine1') }}<br>
            <em>{{ t('home.titleLine2') }}</em>
          </h1>
          <p class="hero-description">
            {{ t('home.description') }}
          </p>

          <form class="hero-search" role="search" @submit.prevent="submitSearch">
            <label for="creator-search">{{ t('home.searchLabel') }}</label>
            <div class="search-control">
              <span class="search-icon" aria-hidden="true">⌕</span>
              <input
                id="creator-search"
                v-model="search"
                type="search"
                :placeholder="t('common.searchPlaceholder')"
                autocomplete="off"
              >
              <button type="submit" class="button button-primary">
                {{ t('home.searchButton') }}
              </button>
            </div>
          </form>
        </div>

      </div>

      <div class="container stats-row" aria-label="Site statistics">
        <div>
          <strong>{{ creators.length }}</strong>
          <span>{{ statLabel('statsProfiles', creators.length) }}</span>
        </div>
        <div>
          <strong>{{ publishedCount }}</strong>
          <span>{{ statLabel('statsPublished', publishedCount) }}</span>
        </div>
        <div>
          <strong>{{ equipmentCount }}</strong>
          <span>{{ statLabel('statsItems', equipmentCount) }}</span>
        </div>
      </div>
    </section>

    <section class="section section-muted">
      <div class="container">
        <div class="section-heading heading-split">
          <div>
            <p class="eyebrow">{{ t('home.featuredEyebrow') }}</p>
            <h2>{{ t('home.featuredTitle') }}</h2>
          </div>
          <div>
            <p>{{ t('home.featuredDescription') }}</p>
            <NuxtLink :to="localePath('/creators')" class="text-link">
              {{ t('common.viewAll') }} →
            </NuxtLink>
          </div>
        </div>

        <div class="creator-grid">
          <CreatorCard
            v-for="creator in featuredCreators"
            :key="creator.slug"
            :creator="creator"
          />
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-heading narrow-heading">
          <p class="eyebrow">{{ t('home.principlesEyebrow') }}</p>
          <h2>{{ t('home.principlesTitle') }}</h2>
        </div>

        <div class="principle-grid">
          <article>
            <span class="principle-number">01</span>
            <h3>{{ t('home.principle1Title') }}</h3>
            <p>{{ t('home.principle1Text') }}</p>
          </article>
          <article>
            <span class="principle-number">02</span>
            <h3>{{ t('home.principle2Title') }}</h3>
            <p>{{ t('home.principle2Text') }}</p>
          </article>
          <article>
            <span class="principle-number">03</span>
            <h3>{{ t('home.principle3Title') }}</h3>
            <p>{{ t('home.principle3Text') }}</p>
          </article>
        </div>

        <div class="cta-panel">
          <div>
            <p class="eyebrow">CONTRIBUTE / VERIFY</p>
            <h2>{{ t('home.ctaTitle') }}</h2>
            <p>{{ t('home.ctaText') }}</p>
          </div>
          <NuxtLink :to="localePath('/methodology')" class="button button-light">
            {{ t('home.ctaButton') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
