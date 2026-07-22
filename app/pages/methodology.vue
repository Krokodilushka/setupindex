<script setup lang="ts">
import { safeJsonLd } from '../utils/content'

const route = useRoute()
const { locale, t } = useI18n()
const config = useRuntimeConfig()

const sourceTiers = computed(() => [
  { title: t('methodology.tier1Title'), text: t('methodology.tier1Text'), level: 'A' },
  { title: t('methodology.tier2Title'), text: t('methodology.tier2Text'), level: 'B' },
  { title: t('methodology.tier3Title'), text: t('methodology.tier3Text'), level: 'C' },
  { title: t('methodology.tier4Title'), text: t('methodology.tier4Text'), level: 'LEAD' },
])
const labels = computed(() => [
  { status: 'confirmed' as const, text: t('methodology.confirmedText') },
  { status: 'reported' as const, text: t('methodology.reportedText') },
  { status: 'historical' as const, text: t('methodology.historicalText') },
  { status: 'research' as const, text: t('methodology.researchText') },
])

useSeoMeta({
  title: () => t('methodology.seoTitle'),
  description: () => t('methodology.seoDescription'),
  ogTitle: () => t('methodology.seoTitle'),
  ogDescription: () => t('methodology.seoDescription'),
  ogType: 'article',
  robots: 'index, follow, max-image-preview:large',
})

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: safeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: t('methodology.seoTitle'),
        description: t('methodology.seoDescription'),
        url: `${config.public.siteUrl}${route.path}`,
        inLanguage: locale.value,
        datePublished: '2026-07-22',
        dateModified: '2026-07-22',
        author: {
          '@type': 'Organization',
          name: 'SetupIndex',
          url: config.public.siteUrl,
        },
      }),
    },
  ],
}))
</script>

<template>
  <div class="methodology-page">
    <section class="page-hero methodology-hero section">
      <div class="container narrow-container">
        <p class="eyebrow">{{ t('methodology.eyebrow') }}</p>
        <h1>{{ t('methodology.title') }}</h1>
        <p class="page-intro">{{ t('methodology.description') }}</p>
      </div>
    </section>

    <section class="section methodology-content">
      <div class="container narrow-container">
        <article class="method-section">
          <span class="method-kicker">01 / SOURCES</span>
          <h2>{{ t('methodology.sourceTitle') }}</h2>
          <p class="method-intro">{{ t('methodology.sourceIntro') }}</p>

          <div class="source-tier-list">
            <div v-for="tier in sourceTiers" :key="tier.level" class="source-tier">
              <span>{{ tier.level }}</span>
              <div>
                <h3>{{ tier.title }}</h3>
                <p>{{ tier.text }}</p>
              </div>
            </div>
          </div>
        </article>

        <article class="method-section">
          <span class="method-kicker">02 / LABELS</span>
          <h2>{{ t('methodology.labelsTitle') }}</h2>

          <div class="label-explainer-grid">
            <div v-for="item in labels" :key="item.status">
              <StatusBadge :status="item.status" />
              <p>{{ item.text }}</p>
            </div>
          </div>
        </article>

        <div class="method-two-column">
          <article class="method-section method-card">
            <span class="method-kicker">03 / FRESHNESS</span>
            <h2>{{ t('methodology.datesTitle') }}</h2>
            <p>{{ t('methodology.datesText') }}</p>
          </article>

          <article class="method-section method-card">
            <span class="method-kicker">04 / SEO</span>
            <h2>{{ t('methodology.seoTitleSection') }}</h2>
            <p>{{ t('methodology.seoText') }}</p>
          </article>
        </div>

        <div class="method-two-column">
          <article class="method-section method-card">
            <span class="method-kicker">05 / MONEY</span>
            <h2>{{ t('methodology.moneyTitle') }}</h2>
            <p>{{ t('methodology.moneyText') }}</p>
          </article>

          <article class="method-section method-card">
            <span class="method-kicker">06 / HISTORY</span>
            <h2>{{ t('methodology.correctionsTitle') }}</h2>
            <p>{{ t('methodology.correctionsText') }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
