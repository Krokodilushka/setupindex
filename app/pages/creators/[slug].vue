<script setup lang="ts">
import type { Creator, EquipmentItem } from '../../types/content'
import { formatIsoDate, localize, safeJsonLd, sortSourcesNewestFirst, sourceUrlHost } from '../../utils/content'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const slug = String(route.params.slug)
const { data: creatorData, error: creatorError } = await useFetch<Creator>(`/api/creators/${encodeURIComponent(slug)}`)
const { data: creatorList } = await useFetch<Creator[]>('/api/creators', {
  default: () => [],
})
const creator = creatorData.value

if (creatorError.value || !creator) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Creator not found',
  })
}

const content = computed(() => creator.content[locale.value as 'en' | 'ru'])
const realName = computed(() => localize(creator.realName, locale.value))
const relatedCreators = computed(() => creatorList.value
  .filter(item => item.slug !== creator.slug && item.kinds.some(kind => creator.kinds.includes(kind)))
  .slice(0, 3))
const sourceGroups = computed(() => sortSourcesNewestFirst(creator.sources)
  .map(source => ({
    source,
    items: creator.equipment.filter(item => item.sourceIds.includes(source.id)),
  }))
  .filter(group => group.items.length))
function affiliateUrl(item: EquipmentItem) {
  return item.affiliateUrl?.[locale.value as 'en' | 'ru']
}
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

        <div class="profile-identity">
          <CreatorAvatar
            :initials="creator.initials"
            :accent="creator.accent"
            :image="creator.avatarUrl"
            size="large"
          />
          <div class="profile-identity-copy">
            <p class="eyebrow">{{ content.eyebrow }}</p>
            <h1>{{ creator.name }}</h1>
            <p v-if="realName" class="profile-real-name">{{ realName }}</p>
          </div>
        </div>

        <div class="profile-hero-toolbar">
          <div class="profile-hero-facts">
            <div class="profile-review-date">
              <span>{{ t('profile.lastReviewed') }}</span>
              <time :datetime="creator.updatedAt">{{ formatIsoDate(creator.updatedAt, locale) }}</time>
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

          <nav
            v-if="creator.socials?.length"
            class="profile-social-links"
            :aria-label="t('profile.socialsTitle')"
          >
            <a
              v-for="social in creator.socials"
              :key="social.url"
              :href="social.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ social.label }}
              <span aria-hidden="true">↗</span>
              <span class="sr-only">({{ t('common.externalLink') }})</span>
            </a>
          </nav>
        </div>
      </div>
    </section>

    <section class="section profile-content-section">
      <div class="container">
        <div class="profile-main">
          <section aria-labelledby="equipment-title">
            <div class="section-heading compact-heading">
              <h2 id="equipment-title">{{ t('profile.equipmentTitle') }}</h2>
              <p>{{ t('profile.equipmentDescription') }}</p>
            </div>

            <div v-if="sourceGroups.length" class="source-group-list">
              <article
                v-for="group in sourceGroups"
                :key="group.source.id"
                class="source-group"
              >
                <header class="source-group-header">
                  <div class="source-group-heading">
                    <p class="source-label">{{ t('common.source') }}</p>
                    <h3>
                      <a
                        :href="group.source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ sourceUrlHost(group.source.url) }}
                        <span aria-hidden="true">↗</span>
                        <span class="sr-only">({{ t('common.externalLink') }})</span>
                      </a>
                    </h3>
                    <p v-if="localize(group.source.description, locale)" class="source-description">
                      {{ localize(group.source.description, locale) }}
                    </p>
                  </div>
                  <dl v-if="group.source.sourceUpdatedAt" class="source-group-date">
                    <dt>{{ t('common.sourceUpdated') }}</dt>
                    <dd>
                      <time :datetime="group.source.sourceUpdatedAt">
                        {{ formatIsoDate(group.source.sourceUpdatedAt, locale) }}
                      </time>
                    </dd>
                  </dl>
                </header>

                <div class="equipment-table-wrap">
                  <table class="equipment-table">
                    <thead>
                      <tr>
                        <th scope="col">{{ t('profile.equipmentCategory') }}</th>
                        <th scope="col">{{ t('profile.equipmentModel') }}</th>
                        <th scope="col">{{ t('profile.equipmentDetails') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in group.items"
                        :key="`${group.source.id}-${item.category}-${item.name}`"
                      >
                        <td class="equipment-table-category">
                          {{ t(`equipment.${item.category}`) }}
                        </td>
                        <td class="equipment-table-model">
                          <strong>{{ item.name }}</strong>
                          <a
                            v-if="affiliateUrl(item)"
                            :href="affiliateUrl(item)"
                            target="_blank"
                            rel="sponsored noopener noreferrer"
                          >
                            {{ t('profile.findProduct') }}
                            <span aria-hidden="true">↗</span>
                            <span class="sr-only">({{ t('common.externalLink') }})</span>
                          </a>
                        </td>
                        <td class="equipment-table-note">
                          {{ localize(item.note, locale) || '—' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            <div v-else class="empty-equipment-state">
              <div class="empty-equipment-icon" aria-hidden="true">?</div>
              <div>
                <h3>{{ t('profile.noEquipmentTitle') }}</h3>
                <p>{{ t('profile.noEquipmentText') }}</p>
              </div>
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
