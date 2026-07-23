import type { Creator } from '../../app/types/content'
import type { CreatorImport } from '../../app/utils/creator-schema'
import type { H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { creatorImportSchema, validateCreatorSemantics } from '../../app/utils/creator-schema'
import { withCreatorAccent } from '../../shared/utils/creator-accent'

export interface ImportPreviewItem {
  action: 'create' | 'update'
  slug: string
  valid: boolean
  problems: string[]
  changedFields: string[]
  equipmentBefore: number
  equipmentAfter: number
  sourcesBefore: number
  sourcesAfter: number
}

export interface ImportPreview {
  valid: boolean
  signature?: string
  items: ImportPreviewItem[]
}

function signingSecret(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const secret = String(config.session?.password || '')
  if (secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SESSION_PASSWORD must contain at least 32 characters',
    })
  }
  return secret
}

export function parseImportBatch(input: unknown): CreatorImport {
  const result = creatorImportSchema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Import file validation failed',
      data: {
        problems: result.error.issues.map(issue =>
          `${issue.path.join('.') || 'file'}: ${issue.message}`,
        ),
      },
    })
  }
  return {
    ...result.data,
    operations: result.data.operations.map(operation => ({
      ...operation,
      document: withCreatorAccent(operation.document),
    })),
  } as CreatorImport
}

export function signImportBatch(event: H3Event, batch: CreatorImport): string {
  return createHmac('sha256', signingSecret(event))
    .update(JSON.stringify(batch))
    .digest('base64url')
}

export function verifyImportSignature(
  event: H3Event,
  batch: CreatorImport,
  signature: unknown,
): boolean {
  if (typeof signature !== 'string')
    return false

  const expected = Buffer.from(signImportBatch(event, batch))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function changedTopLevelFields(before: Creator, after: Creator): string[] {
  return Object.keys(after).filter((key) => {
    const field = key as keyof Creator
    return JSON.stringify(before[field]) !== JSON.stringify(after[field])
  })
}

export async function previewImport(event: H3Event, batch: CreatorImport): Promise<ImportPreview> {
  const existingCreators = new Map(
    (await listStoredCreators()).map(creator => [creator.document.slug, creator]),
  )
  const seenSlugs = new Set<string>()
  const items: ImportPreviewItem[] = []

  for (const operation of batch.operations) {
    const slug = operation.action === 'create' ? operation.document.slug : operation.slug
    const existing = existingCreators.get(slug)
    const problems = validateCreatorSemantics(operation.document)

    if (seenSlugs.has(slug))
      problems.push(`duplicate operation for "${slug}"`)
    seenSlugs.add(slug)

    if (operation.action === 'create' && existing)
      problems.push(`creator "${slug}" already exists`)

    if (operation.action === 'update') {
      if (operation.document.slug !== operation.slug)
        problems.push('an update import cannot change slug')
      if (!existing)
        problems.push(`creator "${slug}" does not exist`)
      else if (existing.version !== operation.expectedVersion)
        problems.push(`expected version ${operation.expectedVersion}, current version is ${existing.version}`)
    }

    items.push({
      action: operation.action,
      slug,
      valid: problems.length === 0,
      problems,
      changedFields: existing ? changedTopLevelFields(existing.document, operation.document) : Object.keys(operation.document),
      equipmentBefore: existing?.document.equipment.length || 0,
      equipmentAfter: operation.document.equipment.length,
      sourcesBefore: existing?.document.sources.length || 0,
      sourcesAfter: operation.document.sources.length,
    })
  }

  const valid = items.every(item => item.valid)
  return {
    valid,
    signature: valid ? signImportBatch(event, batch) : undefined,
    items,
  }
}
