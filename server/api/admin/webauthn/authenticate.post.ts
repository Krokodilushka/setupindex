import { eq } from 'drizzle-orm'
import { webauthnCredentials } from '../../../database/schema'

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(_event, challenge, attemptId) {
    await storeWebAuthnChallenge('authenticate', attemptId, challenge)
  },
  async getChallenge(_event, attemptId) {
    return takeWebAuthnChallenge('authenticate', attemptId)
  },
  async getOptions() {
    return {
      userVerification: 'required',
    }
  },
  async allowCredentials() {
    const credential = await findAdminCredential()
    if (!credential) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Administrator passkey is not configured',
      })
    }

    return [{
      id: credential.id,
      transports: credential.transports,
    }]
  },
  async getCredential(_event, credentialId) {
    const credential = await findAdminCredential(credentialId)
    if (!credential) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unknown passkey',
      })
    }

    return {
      ...credential,
      aaguid: credential.aaguid || undefined,
    }
  },
  async onSuccess(event, { credential, authenticationInfo }) {
    const db = await useAppDatabase()
    await db
      .update(webauthnCredentials)
      .set({ counter: authenticationInfo.newCounter })
      .where(eq(webauthnCredentials.id, credential.id))

    await setUserSession(event, {
      user: { id: 'admin' },
      loggedInAt: Date.now(),
    })
  },
})
