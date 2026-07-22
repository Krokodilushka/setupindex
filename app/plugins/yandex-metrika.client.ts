declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const counterId = Number(config.public.yandexMetrikaId)

  if (!Number.isSafeInteger(counterId) || counterId <= 0) {
    return
  }

  let previousUrl = document.referrer

  nuxtApp.hook('page:finish', () => {
    const currentUrl = window.location.href

    window.ym?.(counterId, 'hit', currentUrl, {
      title: document.title,
      referer: previousUrl || undefined,
    })

    previousUrl = currentUrl
  })
})
