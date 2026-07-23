// Data integrity checks for the portable content import.
// Run with `npm run validate` (Node strips the types natively).
import type { Creator } from '../app/types/content.ts'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { creatorImportSchema } from '../app/utils/creator-schema.ts'

const locales = ['en', 'ru'] as const
const problems: string[] = []
const importPath = fileURLToPath(new URL('../docs/imports/setupindex-creators.json', import.meta.url))
const avatarDirectory = fileURLToPath(new URL('../docs/imports/avatars', import.meta.url))
const rawImport = JSON.parse(readFileSync(importPath, 'utf8'))
const parsedImport = creatorImportSchema.safeParse(rawImport)

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

if (!parsedImport.success) {
  for (const issue of parsedImport.error.issues)
    problems.push(`import.${issue.path.join('.') || 'root'}: ${issue.message}`)
}

const operations = Array.isArray(rawImport.operations) ? rawImport.operations : []
for (const [index, operation] of operations.entries())
  report(operation?.action !== 'create', `import operation ${index + 1}: only "create" is allowed in the clean-database import`)

const creators = operations
  .map(operation => operation?.document)
  .filter((creator): creator is Creator => Boolean(creator))

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
  for (const key of reference.keys)
    report(!other.keys.has(key), `i18n: "${key}" exists in ${reference.locale}.json but not in ${other.locale}.json`)
  for (const key of other.keys)
    report(!reference.keys.has(key), `i18n: "${key}" exists in ${other.locale}.json but not in ${reference.locale}.json`)
}

// --- Creator records ---------------------------------------------------------

const seenSlugs = new Set<string>()
const referencedAvatars = new Set<string>()
const today = new Date().toISOString().slice(0, 10)
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

for (const creator of creators) {
  const where = `creator "${creator.slug}"`

  report(seenSlugs.has(creator.slug), `${where}: duplicate slug`)
  seenSlugs.add(creator.slug)
  report(!/^[a-z0-9-]+$/.test(creator.slug), `${where}: slug must be lowercase letters, digits and hyphens`)
  report(creator.equipment.length === 0, `${where}: inactive profile has no equipment`)
  report('indexable' in creator, `${where}: legacy indexable field is present`)
  report('verificationStatus' in creator, `${where}: legacy verificationStatus field is present`)

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

    for (const field of ['seoTitle', 'seoDescription', 'eyebrow'] as const)
      report(!content[field]?.trim(), `${where}: empty ${locale}.${field}`)

    report(content.seoTitle.length > 70, `${where}: ${locale}.seoTitle is ${content.seoTitle.length} chars (max 70)`)
    report(content.seoDescription.length > 165, `${where}: ${locale}.seoDescription is ${content.seoDescription.length} chars (max 165)`)
    report('researchNote' in content || 'intro' in content || 'verdict' in content, `${where}: legacy ${locale} content fields are present`)
  }

  report(!creator.avatarUrl?.startsWith('/uploads/avatars/'), `${where}: avatarUrl is not a local upload path`)
  if (creator.avatarUrl?.startsWith('/uploads/avatars/')) {
    const filename = basename(creator.avatarUrl)
    referencedAvatars.add(filename)
    report(!existsSync(resolve(avatarDirectory, filename)), `${where}: avatar file "${filename}" is missing`)
  }

  const sourceIds = new Set<string>()
  for (const [sourceIndex, source] of creator.sources.entries()) {
    report(sourceIds.has(source.id), `${where}: duplicate source id "${source.id}"`)
    sourceIds.add(source.id)
    report(!isIsoDate(source.checkedAt), `${where}: source "${source.id}" has invalid checkedAt "${source.checkedAt}"`)
    report(source.checkedAt > today, `${where}: source "${source.id}" was checked in the future`)
    report(
      source.sourceUpdatedAt !== undefined && !isIsoDate(source.sourceUpdatedAt),
      `${where}: source "${source.id}" has invalid sourceUpdatedAt "${source.sourceUpdatedAt}"`,
    )
    report(source.url !== undefined && !source.url.startsWith('https://'), `${where}: source "${source.id}" url is not https`)
    for (const locale of locales)
      report(!source.title[locale]?.trim(), `${where}: source "${source.id}" has no ${locale} title`)

    const previousSource = creator.sources[sourceIndex - 1]
    if (previousSource) {
      const previousDate = previousSource.sourceUpdatedAt || previousSource.checkedAt
      const sourceDate = source.sourceUpdatedAt || source.checkedAt
      report(previousDate < sourceDate, `${where}: sources are not sorted newest first`)
    }
  }

  const usedSourceIds = new Set(creator.equipment.flatMap(item => item.sourceIds))
  for (const item of creator.equipment) {
    const itemWhere = `${where}, equipment "${item.name}"`
    report(!item.name.trim(), `${where}: equipment entry with empty name`)
    report(item.sourceIds.length === 0, `${itemWhere}: has no sourceIds`)
    report('status' in item, `${itemWhere}: legacy status field is present`)

    for (const id of item.sourceIds)
      report(!sourceIds.has(id), `${itemWhere}: references unknown source id "${id}"`)
    for (const locale of locales) {
      const url = item.affiliateUrl?.[locale]
      report(url !== undefined && !url.startsWith('https://'), `${itemWhere}: ${locale} affiliate url is not https`)
    }
  }

  for (const id of sourceIds)
    report(!usedSourceIds.has(id), `${where}: source "${id}" is never referenced by any equipment item`)
}

for (const filename of readdirSync(avatarDirectory).filter(name => name.endsWith('.webp')))
  report(!referencedAvatars.has(filename), `avatars: unreferenced file "${filename}"`)

if (problems.length) {
  console.error(`Content validation failed with ${problems.length} problem(s):\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Content OK: ${creators.length} active creators, ${creators.reduce((sum, creator) => sum + creator.equipment.length, 0)} equipment items and ${referencedAvatars.size} local avatars.`)
