// Data integrity checks that types cannot express.
// Run with `npm run validate` (Node strips the types natively, no build step).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { creators } from '../app/data/creators.ts'

const locales = ['en', 'ru'] as const
const problems: string[] = []

function report(condition: boolean, message: string) {
  if (condition)
    problems.push(message)
}

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) =>
    entry && typeof entry === 'object'
      ? flattenKeys(entry as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

// --- Translation files stay key-identical -----------------------------------

const localeKeys = locales.map((locale) => {
  const path = fileURLToPath(new URL(`../i18n/locales/${locale}.json`, import.meta.url))

  return {
    locale,
    keys: new Set(flattenKeys(JSON.parse(readFileSync(path, 'utf8')))),
  }
})

const [reference, ...others] = localeKeys

for (const other of others) {
  for (const key of reference.keys) {
    report(!other.keys.has(key), `i18n: "${key}" exists in ${reference.locale}.json but not in ${other.locale}.json`)
  }
  for (const key of other.keys) {
    report(!reference.keys.has(key), `i18n: "${key}" exists in ${other.locale}.json but not in ${reference.locale}.json`)
  }
}

// --- Creator records --------------------------------------------------------

const seenSlugs = new Set<string>()
const today = new Date().toISOString().slice(0, 10)
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

for (const creator of creators) {
  const where = `creator "${creator.slug}"`

  report(seenSlugs.has(creator.slug), `${where}: duplicate slug`)
  seenSlugs.add(creator.slug)

  report(!/^[a-z0-9-]+$/.test(creator.slug), `${where}: slug must be lowercase letters, digits and hyphens`)

  for (const [field, value] of [['publishedAt', creator.publishedAt], ['updatedAt', creator.updatedAt]] as const) {
    report(!isIsoDate(value), `${where}: ${field} "${value}" is not a YYYY-MM-DD date`)
    report(value > today, `${where}: ${field} "${value}" is in the future`)
  }

  report(creator.updatedAt < creator.publishedAt, `${where}: updatedAt precedes publishedAt`)

  for (const locale of locales) {
    const content = creator.content[locale]
    report(!content, `${where}: missing "${locale}" content`)

    if (!content)
      continue

    for (const field of ['seoTitle', 'seoDescription', 'eyebrow', 'intro', 'verdict'] as const) {
      report(!content[field]?.trim(), `${where}: empty ${locale}.${field}`)
    }

    // Google truncates well before these limits; overruns are silent SEO waste.
    report(content.seoTitle.length > 70, `${where}: ${locale}.seoTitle is ${content.seoTitle.length} chars (max 70)`)
    report(content.seoDescription.length > 165, `${where}: ${locale}.seoDescription is ${content.seoDescription.length} chars (max 165)`)
  }

  // Source wiring: a typo in sourceIds silently renders equipment with no source link.
  const sourceIds = new Set<string>()

  for (const source of creator.sources) {
    report(sourceIds.has(source.id), `${where}: duplicate source id "${source.id}"`)
    sourceIds.add(source.id)

    report(!isIsoDate(source.checkedAt), `${where}: source "${source.id}" has invalid checkedAt "${source.checkedAt}"`)
    report(source.checkedAt > today, `${where}: source "${source.id}" was checked in the future`)
    report(
      source.sourceUpdatedAt !== undefined && !isIsoDate(source.sourceUpdatedAt),
      `${where}: source "${source.id}" has invalid sourceUpdatedAt "${source.sourceUpdatedAt}"`,
    )
    report(!source.url.startsWith('https://'), `${where}: source "${source.id}" url is not https`)

    for (const locale of locales) {
      report(!source.title[locale]?.trim(), `${where}: source "${source.id}" has no ${locale} title`)
    }
  }

  const usedSourceIds = new Set(creator.equipment.flatMap(item => item.sourceIds))

  for (const item of creator.equipment) {
    const item_ = `${where}, equipment "${item.name}"`

    report(!item.name.trim(), `${where}: equipment entry with empty name`)
    report(item.sourceIds.length === 0, `${item_}: has no sourceIds`)

    for (const id of item.sourceIds) {
      report(!sourceIds.has(id), `${item_}: references unknown source id "${id}"`)
    }

    for (const locale of locales) {
      const url = item.affiliateUrl?.[locale]
      report(url !== undefined && !url.startsWith('https://'), `${item_}: ${locale} affiliate url is not https`)
    }
  }

  for (const id of sourceIds) {
    report(!usedSourceIds.has(id), `${where}: source "${id}" is never referenced by any equipment item`)
  }

  // The editorial contract: indexable pages must actually carry sourced content.
  report(
    creator.indexable && creator.equipment.length === 0,
    `${where}: marked indexable but has no equipment`,
  )
  report(
    creator.indexable && creator.verificationStatus === 'research',
    `${where}: marked indexable while still in research`,
  )
  report(
    !creator.indexable && creator.equipment.length > 0 && creator.verificationStatus !== 'research',
    `${where}: has sourced equipment but is still excluded from indexing`,
  )
}

// --- Result -----------------------------------------------------------------

if (problems.length) {
  console.error(`Content validation failed with ${problems.length} problem(s):\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Content OK: ${creators.length} creators, ${creators.filter(c => c.indexable).length} indexable, ${creators.reduce((n, c) => n + c.equipment.length, 0)} equipment items.`)
