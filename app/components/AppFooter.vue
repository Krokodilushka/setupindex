<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getUTCFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <NuxtLink :to="localePath('/')" class="brand footer-brand" aria-label="SetupIndex">
          <span class="brand-mark" aria-hidden="true">SI</span>
          <span class="brand-word"><strong>Setup</strong>Index</span>
        </NuxtLink>
        <p class="footer-description">
          {{ t('footer.description') }}
        </p>
      </div>

      <div class="footer-links">
        <strong>{{ t('footer.browse') }}</strong>
        <NuxtLink :to="localePath('/creators')">
          {{ t('nav.creators') }}
        </NuxtLink>
      </div>

      <div class="footer-links">
        <strong>{{ t('footer.standards') }}</strong>
        <NuxtLink :to="localePath('/methodology')">
          {{ t('nav.methodology') }}
        </NuxtLink>
        <a href="/sitemap.xml">Sitemap</a>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>{{ t('footer.copyright', { year }) }}</span>
      <span>{{ t('footer.legal') }}</span>
    </div>
  </footer>
</template>
