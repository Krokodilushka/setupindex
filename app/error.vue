<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    message?: string
  }
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const isNotFound = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => isNotFound.value ? t('error.title404') : t('error.titleDefault'),
  robots: 'noindex, follow',
})

function goToCreators() {
  return clearError({ redirect: localePath('/creators') })
}
</script>

<template>
  <div class="error-page">
    <div class="error-code" aria-hidden="true">
      {{ error.statusCode || 500 }}
    </div>
    <div class="error-content">
      <p class="eyebrow">{{ t('error.eyebrow', { code: error.statusCode || 500 }) }}</p>
      <h1>{{ isNotFound ? t('error.title404') : t('error.titleDefault') }}</h1>
      <p>{{ isNotFound ? t('error.text404') : t('error.textDefault') }}</p>
      <button type="button" class="button button-primary" @click="goToCreators">
        {{ t('error.button') }}
      </button>
    </div>
  </div>
</template>
