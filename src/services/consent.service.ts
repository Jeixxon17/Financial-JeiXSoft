import { ref } from 'vue'
import { doc, setDoc } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { auth, db } from '@/firebase/config'
import { authState } from '@/services/auth.service'
import { consentVersion, type ConsentKey, type ConsentRecord } from '@/legal/legal'

// Autorizaciones del usuario en users/{uid}.consents.<clave> = { version, acceptedAt, platform }.
// Al retirarla queda el registro con revokedAt (sirve de prueba de cuándo la dio y la quitó).

type StoredConsent = ConsentRecord & { revokedAt?: string }

// Tiene la autorización vigente: aceptada, en la versión actual y sin retirar
export function hasConsent(key: ConsentKey): boolean {
  const record = authState.consents[key] as StoredConsent | undefined
  return !!record && record.version === consentVersion(key) && !record.revokedAt
}

export async function saveConsents(keys: ConsentKey[]) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('not-signed-in')
  const acceptedAt = new Date().toISOString()
  const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
  const consents = Object.fromEntries(keys.map(key => [key, { version: consentVersion(key), acceptedAt, platform }]))
  await setDoc(doc(db, 'users', uid), { consents }, { merge: true })
  // Se refleja ya (el perfil también llega por onSnapshot)
  Object.assign(authState.consents, consents)
}

type FeatureKind = 'statements' | 'notifications' | 'sms'

// Para pantallas: corre la acción si ya hay autorización; si no, pide la autorización
// (la pantalla pinta <ConsentSheet v-if="asking" :kind="asking" @accept="accepted" @cancel="cancelled" />)
export function useConsent() {
  const asking = ref<FeatureKind | null>(null)
  let next: (() => void) | null = null
  function withConsent(kind: FeatureKind, action: () => void) {
    if (hasConsent(kind)) return action()
    asking.value = kind
    next = action
  }
  function accepted() {
    asking.value = null
    next?.()
    next = null
  }
  function cancelled() {
    asking.value = null
    next = null
  }
  return { asking, withConsent, accepted, cancelled }
}

export async function revokeConsent(key: ConsentKey) {
  const uid = auth.currentUser?.uid
  const record = authState.consents[key]
  if (!uid || !record) return
  const revoked = { ...record, revokedAt: new Date().toISOString() }
  await setDoc(doc(db, 'users', uid), { consents: { [key]: revoked } }, { merge: true })
  authState.consents = { ...authState.consents, [key]: revoked }
}
