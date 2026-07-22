<script setup lang="ts">
import { creators } from '../../data/creators'
import { formatIsoDate, localize, safeJsonLd } from '../../utils/content'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const creator = creators.find(item => item.slug === route.params.slug)

if (!creator) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Creator not found',
  })
}

const content = computed(() => creator.content[locale.value as 'en' | 'ru'])
const realName = computed(() => localize(creator.realName, locale.value))
const relatedCreators = computed(() => creators
  .filter(item => item.slug !== creator.slug && item.kinds.some(kind => creator.kinds.includes(kind)))
  .slice(0, 3))
const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: localePath('/') },
  { label: t('nav.creators'), to: localePath('/creators') },
  { label: creator.name },
])
const faqItems = computed(() => [
  {
    question: t('profile.faqPcQuestion', { name: creator.name }),
    answer: creator.equipment.length
      ? t('profile.faqPcAnswerKnown')
      : t('profile.faqPcAnswerUnknown'),
  },
  {
    question: t('profile.faqFreshQuestion', { name: creator.name }),
    answer: t('profile.faqFreshAnswer'),
  },
  {
    question: t('profile.faqBuyQuestion'),
    answer: t('profile.faqBuyAnswer'),
  },
])

useSeoMeta({
  title: () => content.value.seoTitle,
  description: () => content.value.seoDescription,
  ogTitle: () => content.value.seoTitle,
  ogDescription: () => content.value.seoDescription,
  ogType: 'profile',
  articlePublishedTime: creator.publishedAt,
  articleModifiedTime: creator.updatedAt,
  robots: creator.indexable
    ? 'index, follow, max-image-preview:large'
    : 'noindex, follow',
})

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: safeJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ProfilePage',
            '@id': `${config.public.siteUrl}${route.path}#profile`,
            url: `${config.public.siteUrl}${route.path}`,
            name: content.value.seoTitle,
            description: content.value.seoDescription,
            dateCreated: creator.publishedAt,
            dateModified: creator.updatedAt,
            inLanguage: locale.value,
            mainEntity: {
              '@type': 'Person',
              name: creator.name,
              alternateName: [realName.value, ...creator.aliases].filter(Boolean),
              sameAs: creator.socials?.map(social => social.url),
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems.value.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.label,
              item: item.to ? `${config.public.siteUrl}${item.to}` : `${config.public.siteUrl}${route.path}`,
            })),
          },
          ...(creator.equipment.length
            ? [{
                '@type': 'ItemList',
                name: t('profile.equipmentTitle'),
                itemListElement: creator.equipment.map((item, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: `${t(`equipment.${item.category}`)}: ${item.name}`,
                })),
              }]
            : []),
          {
            '@type': 'FAQPage',
            mainEntity: faqItems.value.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<template>
  <div class="profile-page">
    <section class="profile-hero section" :style="{ '--profile-accent': creator.accent }">
      <div class="container">
        <AppBreadcrumbs :items="breadcrumbItems" />

        <div class="profile-hero-grid">
          <div class="profile-identity">
            <CreatorAvatar :initials="creator.initials" :accent="creator.accent" size="large" />
            <div>
              <p class="eyebrow">{{ content.eyebrow }}</p>
              <h1>{{ creator.name }}</h1>
              <p v-if="realName" class="profile-real-name">{{ realName }}</p>
            </div>
          </div>

          <div class="profile-summary">
            <StatusBadge :status="creator.verificationStatus" />
            <p>{{ content.intro }}</p>
            <div class="profile-meta-row">
              <span>{{ t('profile.lastReviewed') }}</span>
              <strong>{{ formatIsoDate(creator.updatedAt, locale) }}</strong>
            </div>
          </div>
        </div>

        <div class="tag-row profile-tags">
          <span v-for="kind in creator.kinds" :key="kind" class="tag">
            {{ t(`kind.${kind}`) }}
          </span>
          <span v-for="platform in creator.platforms" :key="platform" class="tag tag-muted">
            {{ t(`platform.${platform}`) }}
          </span>
          <span v-if="creator.game" class="tag tag-muted">{{ creator.game }}</span>
        </div>
      </div>
    </section>

    <section class="section profile-content-section">
      <div class="container profile-layout">
        <div class="profile-main">
          <article class="verdict-card">
            <p class="eyebrow">{{ t('profile.verdictTitle') }}</p>
            <p>{{ content.verdict }}</p>
          </article>

          <section aria-labelledby="equipment-title">
            <div class="section-heading compact-heading">
              <h2 id="equipment-title">{{ t('profile.equipmentTitle') }}</h2>
              <p>{{ t('profile.equipmentDescription') }}</p>
            </div>

            <div v-if="creator.equipment.length" class="equipment-grid">
              <EquipmentCard
                v-for="item in creator.equipment"
                :key="`${item.category}-${item.name}`"
                :item="item"
                :sources="creator.sources"
              />
            </div>

            <div v-else class="research-state">
              <div class="research-icon" aria-hidden="true">?</div>
              <div>
                <h3>{{ t('profile.noEquipmentTitle') }}</h3>
                <p>{{ t('profile.noEquipmentText') }}</p>
                <p v-if="content.researchNote" class="research-note">
                  {{ content.researchNote }}
                </p>
              </div>
            </div>
          </section>

          <section class="source-section" aria-labelledby="sources-title">
            <div class="section-heading compact-heading">
              <h2 id="sources-title">{{ t('profile.sourcesTitle') }}</h2>
              <p>{{ t('profile.sourcesDescription') }}</p>
            </div>

            <ol v-if="creator.sources.length" class="source-list">
              <li v-for="(source, index) in creator.sources" :key="source.id">
                <span class="source-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div>
                  <a :href="source.url" target="_blank" rel="noopener noreferrer">
                    {{ localize(source.title, locale) }} ↗
                    <span class="sr-only">({{ t('common.externalLink') }})</span>
                  </a>
                  <p>{{ source.publisher }}</p>
                </div>
                <dl>
                  <template v-if="source.sourceUpdatedAt">
                    <dt>{{ t('common.sourceUpdated') }}</dt>
                    <dd>{{ formatIsoDate(source.sourceUpdatedAt, locale) }}</dd>
                  </template>
                  <dt>{{ t('common.checked') }}</dt>
                  <dd>{{ formatIsoDate(source.checkedAt, locale) }}</dd>
                </dl>
              </li>
            </ol>

            <div v-else class="source-empty">
              {{ t('profile.noEquipmentText') }}
            </div>
          </section>

          <section class="faq-section" aria-labelledby="faq-title">
            <h2 id="faq-title">{{ t('profile.faqTitle') }}</h2>
            <details v-for="item in faqItems" :key="item.question">
              <summary>{{ item.question }}</summary>
              <p>{{ item.answer }}</p>
            </details>
          </section>
        </div>

        <aside class="profile-sidebar">
          <div v-if="creator.socials?.length" class="sidebar-card">
            <h2>{{ t('profile.socialsTitle') }}</h2>
            <a
              v-for="social in creator.socials"
              :key="social.url"
              :href="social.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ social.label }} ↗
            </a>
          </div>

          <div class="sidebar-card sidebar-methodology">
            <span aria-hidden="true">✓</span>
            <h2>{{ t('home.proofTitle') }}</h2>
            <p>{{ t('home.proofText') }}</p>
            <NuxtLink :to="localePath('/methodology')" class="text-link">
              {{ t('common.readMethodology') }} →
            </NuxtLink>
          </div>

          <p class="affiliate-disclosure">
            {{ t('profile.affiliateDisclosure') }}
          </p>
        </aside>
      </div>
    </section>

    <section class="section section-muted related-section">
      <div class="container">
        <h2>{{ t('profile.relatedTitle') }}</h2>
        <div class="creator-grid creator-grid-three">
          <CreatorCard
            v-for="item in relatedCreators"
            :key="item.slug"
            :creator="item"
          />
        </div>
      </div>
    </section>
  </div>
</template>
