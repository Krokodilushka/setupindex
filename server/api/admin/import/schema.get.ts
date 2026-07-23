import { z } from 'zod'
import { creatorImportSchema } from '../../../../app/utils/creator-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'content-disposition', 'attachment; filename="setupindex-import.schema.json"')
  return z.toJSONSchema(creatorImportSchema)
})
