import type { H3Event } from 'h3'
import { count, eq } from 'drizzle-orm'
import { webauthnCredentials } from '../database/schema'

export function requireSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (!origin || origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid request origin',
    })
  }
}

export async function isAdminConfigured(): Promise<boolean> {
  const db = await useAppDatabase()
  const [result] = await db.select({ count: count() }).from(webauthnCredentials)
  return (result?.count || 0) > 0
}

export async function requireAdmin(event: H3Event) {
  const method = event.method.toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method))
    requireSameOrigin(event)

  const session = await requireUserSession(event)

  if (session.user.id !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Administrator access required',
    })
  }

  return session
}

export async function findAdminCredential(id?: string) {
  const db = await useAppDatabase()
  const query = db.select().from(webauthnCredentials)
  const [credential] = id
    ? await query.where(eq(webauthnCredentials.id, id)).limit(1)
    : await query.limit(1)

  return credential
}

export async function storeWebAuthnChallenge(kind: 'register' | 'authenticate', attemptId: string, challenge: string) {
  await useStorage('webauthn').setItem(`${kind}:${attemptId}`, challenge)
}

export async function takeWebAuthnChallenge(kind: 'register' | 'authenticate', attemptId: string): Promise<string> {
  const storage = useStorage('webauthn')
  const key = `${kind}:${attemptId}`
  const challenge = await storage.getItem<string>(key)
  await storage.removeItem(key)

  if (!challenge) {
    throw createError({
      statusCode: 400,
      statusMessage: 'WebAuthn challenge expired',
    })
  }

  return challenge
}
