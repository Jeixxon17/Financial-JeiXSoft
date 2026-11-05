import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { reactive } from 'vue'

import { auth, db } from '@/firebase/config'
import { setDataRoot } from '@/firebase/dataRoot'
import { seedNewUser } from '@/services/onboarding.service'
import type { Consents } from '@/legal/legal'

// ─────────────────────────────────────────────────────────────────────────────
// Acceso de TuPlataAlDia
//
// - Cada usuario entra con correo y contraseña o con Google (Firebase Auth) y
//   sus datos viven en users/{uid}/… (ver firebase/dataRoot.ts).
// - El PIN de 6 dígitos ya no es la contraseña: es el bloqueo de la app. Se
//   guarda cifrado (PBKDF2) en users/{uid} y se pide al abrir la app y tras 5
//   minutos en segundo plano.
// - Cuenta anterior del dueño (v1): correo fijo OWNER_EMAIL y contraseña
//   derivada del PIN. Sigue funcionando igual hasta que el dueño "actualiza su
//   acceso" desde Perfil (services/migration.service.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const OWNER_EMAIL = 'owner@financial-jeixsoft.app'
export const PIN_LENGTH = 6

// Documento público que solo dice si la cuenta anterior ya tiene PIN
const SETUP_DOC = doc(db, 'meta', 'security')

export interface UserProfile {
  name?: string
  email?: string
  createdAt?: string
  // Datos ya copiados a users/{uid} (solo la cuenta anterior del dueño)
  migrated?: boolean
  migratedAt?: string
  pin?: { salt: string; hash: string; iterations: number }
  // Plan Completo: solo lo escribe el servicio de pagos (las reglas no dejan al usuario)
  plan?: 'completo'
  planInfo?: { paidAt: string; reference: string; amount: number; method?: string }
  // Autorizaciones que dio el usuario (términos, privacidad, extractos, lector…) con versión y fecha
  consents?: Consents
}

export const authState = reactive({
  // Firebase ya dijo si hay sesión
  ready: false,
  // Hay usuario con sesión iniciada
  signedIn: false,
  uid: '',
  email: '',
  name: '',
  // Cuenta anterior del dueño, todavía sin actualizar (entra con PIN como contraseña)
  legacy: false,
  // El usuario ya creó su PIN de bloqueo
  pinSet: false,
  // Escribió el PIN en esta apertura de la app
  unlocked: false,
  // Viene de "Olvidé mi PIN": después de iniciar sesión crea uno nuevo
  resettingPin: false,
  // Plan del usuario: 'gratis' o 'completo' (pago único)
  plan: 'gratis' as 'gratis' | 'completo',
  planInfo: null as UserProfile['planInfo'] | null,
  // Autorizaciones guardadas en el perfil (se escuchan en vivo)
  consents: {} as Consents
})

const RESET_PIN_FLAG = 'tp-reset-pin'
let profile: UserProfile | null = null

const profileDoc = (uid: string) => doc(db, 'users', uid)
let stopProfile: Unsubscribe | null = null

// Plan: el dueño (cuenta anterior o su uid en meta/security) tiene todo; los demás
// según lo que escribió el servicio de pagos en su perfil
async function applyPlan(user: User) {
  let owner = user.email === OWNER_EMAIL
  if (!owner) {
    const setup = await getDoc(SETUP_DOC).catch(() => null)
    owner = setup?.exists() === true && setup.data().uid === user.uid
  }
  authState.plan = owner || profile?.plan === 'completo' ? 'completo' : 'gratis'
  authState.planInfo = profile?.planInfo || null
}

// Mientras hay sesión se escucha el perfil: así el plan se desbloquea apenas
// llega el pago, sin recargar
function watchProfile(user: User) {
  stopProfile?.()
  stopProfile = onSnapshot(
    profileDoc(user.uid),
    snap => {
      if (!snap.exists()) return
      profile = { ...(profile || {}), ...(snap.data() as UserProfile) }
      if (profile.plan === 'completo') authState.plan = 'completo'
      authState.planInfo = profile.planInfo || null
      authState.consents = profile.consents || {}
    },
    () => {}
  )
}

// ───────────────────────────── Sesión ─────────────────────────────

export async function initAuth() {
  // Las cuentas nuevas quedan con la sesión iniciada; el PIN protege la app
  await setPersistence(auth, browserLocalPersistence)

  onAuthStateChanged(auth, async user => {
    authState.ready = false
    await applyUser(user)
    authState.ready = true
  })
}

async function applyUser(user: User | null) {
  profile = null
  stopProfile?.()
  stopProfile = null
  Object.assign(authState, { plan: 'gratis', planInfo: null, consents: {} })
  Object.assign(authState, { signedIn: !!user, uid: user?.uid || '', email: user?.email || '', name: user?.displayName || '' })
  authState.resettingPin = !!user && sessionStorage.getItem(RESET_PIN_FLAG) === '1'

  if (!user) {
    setDataRoot(null)
    Object.assign(authState, { legacy: false, pinSet: false, unlocked: false })
    return
  }

  try {
    const snap = await getDoc(profileDoc(user.uid))
    profile = snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    // La cuenta anterior sin las reglas nuevas publicadas no puede leer users/{uid}
    profile = null
  }

  authState.consents = profile?.consents || {}
  const isOwnerAccount = user.email === OWNER_EMAIL
  authState.legacy = isOwnerAccount && !profile?.migrated
  authState.name = user.displayName || profile?.name || ''
  await applyPlan(user)

  if (authState.legacy) {
    // Cuenta anterior: sus datos siguen en las colecciones generales y ya
    // escribió el PIN para entrar
    setDataRoot(null)
    Object.assign(authState, { pinSet: true, unlocked: true })
    return
  }

  setDataRoot(user.uid)
  authState.pinSet = !!profile?.pin
  authState.unlocked = false
  watchProfile(user)
}

export async function signOutUser() {
  sessionStorage.removeItem(RESET_PIN_FLAG)
  await signOut(auth)
  // Empieza de cero: ningún dato del usuario anterior queda en memoria
  window.location.reload()
}

// Bloquear: la cuenta anterior cierra sesión (su PIN es la contraseña); las
// demás conservan la sesión y piden el PIN otra vez
export async function lockApp() {
  if (authState.legacy) {
    await signOut(auth)
    return
  }
  authState.unlocked = false
}

// ───────────────────────────── Correo, Google ─────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence)
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function registerWithEmail(name: string, email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence)
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await updateProfile(user, { displayName: name.trim() })
  authState.name = name.trim()
  sendEmailVerification(user).catch(() => {})
  // Si el perfil no se alcanza a guardar (ej. reglas sin publicar), se completa
  // al crear el PIN (ensureProfile): la cuenta ya existe en Firebase
  await ensureProfile(user).catch(error => console.error('Perfil pendiente', error))
}

// Google abre una ventana: funciona en el navegador. En la app Android hace
// falta el plugin nativo (pendiente)
export const googleAvailable = !Capacitor.isNativePlatform()

export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence)
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
  const snap = await getDoc(profileDoc(user.uid))
  if (!snap.exists() && user.email !== OWNER_EMAIL) {
    await ensureProfile(user).catch(error => console.error('Perfil pendiente', error))
  }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim())
}

// Perfil y categorías iniciales de un usuario nuevo. Se puede llamar varias veces:
// solo hace algo si el perfil todavía no tiene fecha de creación
async function ensureProfile(user: User) {
  if (profile?.createdAt || user.email === OWNER_EMAIL) return
  const data = { name: user.displayName || authState.name || '', email: user.email || '', createdAt: new Date().toISOString() }
  await setDoc(profileDoc(user.uid), data, { merge: true })
  await seedNewUser(user.uid)
  profile = { ...(profile || {}), ...data }
}

// ───────────────────────────── PIN de bloqueo ─────────────────────────────

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

const PIN_ITERATIONS = 150_000

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0))

async function hashPin(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return toBase64(new Uint8Array(bits))
}

// Crea o cambia el PIN de bloqueo (cifrado, nunca el PIN en texto)
export async function setLockPin(pin: string) {
  const user = auth.currentUser
  if (!user || !isValidPin(pin)) throw new Error('invalid-pin')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const pinData = { salt: toBase64(salt), hash: await hashPin(pin, salt, PIN_ITERATIONS), iterations: PIN_ITERATIONS }
  // Usuario nuevo cuyo perfil no se alcanzó a guardar al registrarse
  if (!authState.legacy) await ensureProfile(user)
  await setDoc(profileDoc(user.uid), { pin: pinData }, { merge: true })
  profile = { ...(profile || {}), pin: pinData }
  sessionStorage.removeItem(RESET_PIN_FLAG)
  Object.assign(authState, { pinSet: true, resettingPin: false, unlocked: true })
}

export async function unlockWithPin(pin: string) {
  const data = profile?.pin
  if (!data) throw Object.assign(new Error('no-pin'), { code: 'tp/no-pin' })
  const hash = await hashPin(pin, fromBase64(data.salt), data.iterations)
  if (hash !== data.hash) throw Object.assign(new Error('wrong-pin'), { code: 'tp/wrong-pin' })
  authState.unlocked = true
}

// "Olvidé mi PIN": se cierra la sesión; al volver a entrar con la contraseña
// o Google se crea un PIN nuevo
export async function forgotPin() {
  sessionStorage.setItem(RESET_PIN_FLAG, '1')
  await signOut(auth)
}

export async function changePin(currentPin: string, newPin: string) {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')

  if (authState.legacy) {
    // Cuenta anterior: el PIN es la contraseña
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(OWNER_EMAIL, legacyPassword(currentPin)))
    await updatePassword(user, legacyPassword(newPin))
    return
  }
  await unlockWithPin(currentPin).catch(() => {
    throw Object.assign(new Error('wrong-pin'), { code: 'tp/wrong-pin' })
  })
  await setLockPin(newPin)
}

// ───────────────────────────── Cuenta anterior (v1) ─────────────────────────────

// Firebase pide contraseñas de 6+ caracteres; el PIN se envuelve en una fija
// (Ya no se puede entrar con el PIN desde la pantalla de acceso: la cuenta del dueño se migró.)
const legacyPassword = (pin: string) => `jx-pin-${pin}`

// ─ Actualizar el acceso de la cuenta anterior (lo usa migration.service) ─

// Confirma el PIN actual (Firebase pide haber entrado hace poco para cambiar credenciales)
export async function confirmLegacyPin(pin: string) {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(OWNER_EMAIL, legacyPassword(pin)))
}

export async function linkGoogle() {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')
  await linkWithPopup(user, new GoogleAuthProvider())
}

// Contraseña nueva y correo real (el correo cambia cuando se confirma el enlace que llega)
export async function setRealCredentials(email: string, password: string) {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')
  await updatePassword(user, password)
  if (email.trim() && email.trim() !== user.email) await verifyBeforeUpdateEmail(user, email.trim())
}

// ───────────────────────────── Mensajes ─────────────────────────────

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || ''
  switch (code) {
    case 'tp/wrong-pin':
      return 'PIN incorrecto'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos'
    case 'auth/invalid-email':
      return 'Ese correo no es válido'
    case 'auth/email-already-in-use':
      return 'Ya hay una cuenta con ese correo. Inicia sesión'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo'
    case 'auth/network-request-failed':
      return 'Sin conexión a internet'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Se cerró la ventana de Google'
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes'
    case 'auth/credential-already-in-use':
    case 'auth/provider-already-linked':
      return 'Esa cuenta de Google ya está vinculada a otro usuario'
    case 'auth/admin-restricted-operation':
      return 'Por ahora no se pueden crear cuentas nuevas. Activa el registro en Firebase (Authentication > Configuración > Acciones del usuario)'
    case 'auth/unauthorized-domain':
      return 'Esta dirección no está autorizada en Firebase (Authentication > Configuración > Dominios autorizados)'
    case 'auth/requires-recent-login':
      return 'Por seguridad, confirma tu PIN otra vez'
    case 'auth/operation-not-allowed':
      return 'Falta activar ese método de acceso en Firebase (Authentication > Sign-in method)'
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Firebase no dio permiso para guardar tus datos: falta publicar las reglas nuevas de Firestore'
    case 'auth/password-does-not-meet-requirements':
      return 'La contraseña no cumple las reglas de Firebase (prueba con mayúscula, número y símbolo)'
    default:
      // Se muestra el código para saber qué pasó
      return code ? `No se pudo completar (${code}). Intenta de nuevo` : 'No se pudo completar. Intenta de nuevo'
  }
}

// Compatibilidad con PinPad/ChangePinModal
export const pinErrorMessage = (error: unknown) =>
  authErrorMessage(error) === 'Correo o contraseña incorrectos' ? 'PIN incorrecto' : authErrorMessage(error)
