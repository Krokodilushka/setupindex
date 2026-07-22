<script setup lang="ts">
import type { EquipmentItem, Source } from '../types/content'
import { localize } from '../utils/content'

const props = defineProps<{
  item: EquipmentItem
  sources: Source[]
}>()

const { locale, t } = useI18n()
const itemSources = computed(() => props.sources.filter(source => props.item.sourceIds.includes(source.id)))
const firstSource = computed(() => itemSources.value[0])
const note = computed(() => localize(props.item.note, locale.value))
const affiliateUrl = computed(() => props.item.affiliateUrl?.[locale.value as 'en' | 'ru'])
</script>

<template>
  <article class="equipment-card">
    <div class="equipment-card-header">
      <span class="equipment-category">{{ t(`equipment.${item.category}`) }}</span>
      <StatusBadge :status="item.status" />
    </div>

    <h3>{{ item.name }}</h3>
    <p v-if="note" class="equipment-note">
      {{ note }}
    </p>

    <div class="equipment-card-footer">
      <a
        v-if="firstSource"
        :href="firstSource.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-link"
      >
        {{ firstSource.publisher }} ↗
        <span class="sr-only">({{ t('common.externalLink') }})</span>
      </a>
      <a
        v-if="affiliateUrl"
        :href="affiliateUrl"
        target="_blank"
        rel="sponsored noopener noreferrer"
        class="button button-small button-secondary"
      >
        {{ t('common.search') }}
      </a>
    </div>
  </article>
</template>
