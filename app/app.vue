<script setup lang="ts">
const { t } = useI18n()
const localeHead = useLocaleHead({ seo: true })
const config = useRuntimeConfig()
const yandexMetrikaId = String(config.public.yandexMetrikaId).replace(/\D/g, '')

const metrikaCode = yandexMetrikaId
  ? `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${yandexMetrikaId},"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`
  : ''

useHead(() => ({
  titleTemplate: title => title ? `${title} · SetupIndex` : 'SetupIndex',
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
  script: yandexMetrikaId
    ? [{ key: 'yandex-metrika', innerHTML: metrikaCode }]
    : [],
  noscript: yandexMetrikaId
    ? [{
        key: 'yandex-metrika-noscript',
        innerHTML: `<div><img src="https://mc.yandex.ru/watch/${yandexMetrikaId}" style="position:absolute;left:-9999px" alt=""></div>`,
        tagPosition: 'bodyClose',
      }]
    : [],
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
