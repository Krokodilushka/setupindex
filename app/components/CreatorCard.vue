<script setup lang="ts">
import type { Creator } from '../types/content'
import { formatIsoDate, localize } from '../utils/content'

const props = defineProps<{
  creator: Creator
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const content = computed(() => props.creator.content[locale.value as 'en' | 'ru'])
const realName = computed(() => localize(props.creator.realName, locale.value))
</script>

<template>
  <article class="creator-card" :style="{ '--card-accent': creator.accent }">
    <NuxtLink :to="localePath(`/creators/${creator.slug}`)" class="creator-card-link">
      <div class="creator-card-top">
        <CreatorAvatar :initials="creator.initials" :accent="creator.accent" />
        <StatusBadge :status="creator.verificationStatus" />
      </div>

      <div class="creator-card-body">
        <p class="card-eyebrow">
          {{ content.eyebrow }}
        </p>
        <h3>{{ creator.name }}</h3>
        <p v-if="realName" class="creator-real-name">
          {{ realName }}
        </p>

        <div class="tag-row">
          <span v-for="kind in creator.kinds" :key="kind" class="tag">
            {{ t(`kind.${kind}`) }}
          </span>
          <span v-if="creator.game" class="tag tag-muted">{{ creator.game }}</span>
        </div>
      </div>

      <div class="creator-card-footer">
        <span>{{ t('common.updated') }} {{ formatIsoDate(creator.updatedAt, locale) }}</span>
        <span class="arrow-link" aria-hidden="true">↗</span>
      </div>
    </NuxtLink>
  </article>
</template>
