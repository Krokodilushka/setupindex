import { webauthnCredentials } from '../../../database/schema'

export default defineWebAuthnRegisterEventHandler({
  async storeChallenge(_event, challenge, attemptId) {
    await storeWebAuthnChallenge('register', attemptId, challenge)
  },
  async getChallenge(_event, attemptId) {
    return takeWebAuthnChallenge('register', attemptId)
  },
  async validateUser() {
    if (await isAdminConfigured()) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Administrator passkey is already configured',
      })
    }

    return {
      userName: 'setupindex-admin',
      displayName: 'SetupIndex administrator',
    }
  },
  async getOptions() {
    return {
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      attestationType: 'none',
    }
  },
  async onSuccess(event, { credential }) {
    const db = await useAppDatabase()

    try {
      await db.insert(webauthnCredentials).values({
        id: credential.id,
        ownerKey: 'admin',
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp,
        transports: credential.transports || [],
        aaguid: credential.aaguid,
        createdAt: new Date().toISOString(),
      })
    }
    catch {
      throw createError({
        statusCode: 409,
        statusMessage: 'Administrator passkey was already registered',
      })
    }

    await setUserSession(event, {
      user: { id: 'admin' },
      loggedInAt: Date.now(),
    })
  },
})
