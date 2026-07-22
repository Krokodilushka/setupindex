<script setup lang="ts">
const { t } = useI18n()
const localeHead = useLocaleHead({ seo: true })

useHead(() => ({
  titleTemplate: title => title ? `${title} · SetupIndex` : 'SetupIndex',
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}))

useSeoMeta({
  ogSiteName: 'SetupIndex',
  twitterCard: 'summary',
})
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">{{ t('common.skipToContent') }}</a>
    <AppHeader />
    <main id="main-content">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>
