import type { LocaleCode, LocalizedText } from '../types/content'

export function localize(value: LocalizedText | undefined, locale: string): string {
  if (!value)
    return ''

  return value[locale as LocaleCode] || value.en
}

export function formatIsoDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
