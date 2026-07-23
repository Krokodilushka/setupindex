import type { Creator } from '../../app/types/content'
import { creatorSchema, validateCreatorSemantics } from '../../app/utils/creator-schema'
import { withCreatorAccent } from '../../shared/utils/creator-accent'

export function parseCreatorDocument(input: unknown): Creator {
  const result = creatorSchema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Creator validation failed',
      data: {
        problems: result.error.issues.map(issue =>
          `${issue.path.join('.') || 'document'}: ${issue.message}`,
        ),
      },
    })
  }

  const document = withCreatorAccent(result.data)
  const problems = validateCreatorSemantics(document)
  if (problems.length) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Creator validation failed',
      data: { problems },
    })
  }

  return document
}
