// Nuxt 4.5.0's plugin metadata scanner does not recognize the package's
// `plugin as default` export form. Keep the diagnostic plugin enabled while
// presenting the direct default export that the scanner expects.
import pageUsagePlugin from '#nuxt-page-usage-plugin'

export default defineNuxtPlugin({
  name: 'nuxt:checkIfPageUnused',
  setup: pageUsagePlugin,
  env: { islands: false },
})
