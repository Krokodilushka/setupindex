import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const httpsUrl = z.string().url().startsWith('https://')
const avatarUrl = z.union([
  httpsUrl,
  z.string().regex(/^\/uploads\/avatars\/[a-z0-9][a-z0-9-]*-[a-f0-9]{16}\.webp$/),
  // Legacy inline avatars are written to disk the next time the profile is saved.
  z.string()
    .max(1_500_000)
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/),
])

const localizedTextSchema = z.object({
  en: z.string(),
  ru: z.string(),
})

const sourceSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  publisher: z.string().min(1),
  url: httpsUrl.optional(),
  sourceUpdatedAt: isoDate.optional(),
  checkedAt: isoDate,
  description: localizedTextSchema.optional(),
})

const equipmentSchema = z.object({
  category: z.enum([
    'cpu',
    'gpu',
    'motherboard',
    'memory',
    'psu',
    'laptop',
    'monitor',
    'mouse',
    'keyboard',
    'microphone',
    'audio-interface',
    'speakers',
    'camera',
    'headset',
    'mousepad',
    'chair',
    'case',
    'storage',
    'cooling',
  ]),
  name: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  note: localizedTextSchema.optional(),
  affiliateUrl: z.object({
    en: httpsUrl.optional(),
    ru: httpsUrl.optional(),
  }).optional(),
})

const localeContentSchema = z.object({
  seoTitle: z.string().min(1).max(70),
  seoDescription: z.string().min(1).max(165),
  eyebrow: z.string().min(1),
})

export const creatorSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  realName: localizedTextSchema.optional(),
  aliases: z.array(z.string()),
  initials: z.string().min(1),
  avatarUrl: avatarUrl.optional(),
  // Accepted for compatibility with older exports, but overwritten from slug.
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  kinds: z.array(z.enum(['streamer', 'youtuber', 'esports'])).min(1),
  platforms: z.array(z.enum(['twitch', 'youtube', 'vk-video', 'esports'])).min(1),
  game: z.string().optional(),
  featured: z.boolean(),
  publishedAt: isoDate,
  updatedAt: isoDate,
  content: z.object({
    en: localeContentSchema,
    ru: localeContentSchema,
  }),
  equipment: z.array(equipmentSchema),
  sources: z.array(sourceSchema),
  socials: z.array(z.object({
    label: z.string().min(1),
    url: httpsUrl,
  })).optional(),
})

const createOperationSchema = z.object({
  action: z.literal('create'),
  document: creatorSchema,
})

const updateOperationSchema = z.object({
  action: z.literal('update'),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  expectedVersion: z.number().int().positive(),
  document: creatorSchema,
})

export const creatorImportSchema = z.object({
  format: z.literal('setupindex.creator-batch'),
  version: z.literal(1),
  operations: z.array(z.discriminatedUnion('action', [
    createOperationSchema,
    updateOperationSchema,
  ])).min(1).max(100),
})

export type CreatorImport = {
  format: 'setupindex.creator-batch'
  version: 1
  operations: Array<
    | {
      action: 'create'
      document: import('../types/content').Creator
    }
    | {
      action: 'update'
      slug: string
      expectedVersion: number
      document: import('../types/content').Creator
    }
  >
}

export function validateCreatorSemantics(creator: z.infer<typeof creatorSchema>): string[] {
  const problems: string[] = []
  const today = new Date().toISOString().slice(0, 10)
  const sourceIds = new Set<string>()

  if (creator.updatedAt < creator.publishedAt)
    problems.push('updatedAt precedes publishedAt')

  for (const field of ['publishedAt', 'updatedAt'] as const) {
    if (creator[field] > today)
      problems.push(`${field} is in the future`)
  }

  for (const source of creator.sources) {
    if (sourceIds.has(source.id))
      problems.push(`duplicate source id "${source.id}"`)
    sourceIds.add(source.id)

    if (source.checkedAt > today)
      problems.push(`source "${source.id}" was checked in the future`)
  }

  const usedSourceIds = new Set<string>()
  for (const item of creator.equipment) {
    if (!item.sourceIds.length)
      problems.push(`equipment "${item.name}" has no sourceIds`)

    for (const sourceId of item.sourceIds) {
      usedSourceIds.add(sourceId)
      if (!sourceIds.has(sourceId))
        problems.push(`equipment "${item.name}" references unknown source "${sourceId}"`)
    }
  }

  for (const sourceId of sourceIds) {
    if (!usedSourceIds.has(sourceId))
      problems.push(`source "${sourceId}" is not used by equipment`)
  }

  return problems
}
