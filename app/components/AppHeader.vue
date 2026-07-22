<script setup lang="ts">
const { locale, locales, t } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

const otherLocales = computed(() => locales.value.filter(item => item.code !== locale.value))
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <NuxtLink :to="localePath('/')" class="brand" aria-label="SetupIndex">
        <span class="brand-mark" aria-hidden="true">SI</span>
        <span class="brand-word"><strong>Setup</strong>Index</span>
      </NuxtLink>

      <nav class="main-nav" :aria-label="t('nav.menuLabel')">
        <NuxtLink :to="localePath('/')" exact-active-class="is-active">
          {{ t('nav.home') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/creators')" active-class="is-active">
          {{ t('nav.creators') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/methodology')" active-class="is-active">
          {{ t('nav.methodology') }}
        </NuxtLink>
      </nav>

      <nav class="locale-switcher" :aria-label="t('nav.languageLabel')">
        <NuxtLink
          v-for="item in otherLocales"
          :key="item.code"
          :to="switchLocalePath(item.code)"
          :hreflang="item.language"
          class="locale-link"
        >
          {{ item.code.toUpperCase() }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
