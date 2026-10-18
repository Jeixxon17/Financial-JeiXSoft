import {
  EmailAuthProvider,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { reactive } from 'vue'

import { auth, db } from '@/firebase/config'

// Cuenta única de la app. No es un correo real: solo identifica al dueño en
// Firebase Auth y en las reglas de Firestore (firestore.rules).
export const OWNER_EMAIL = 'owner@financial-jeixsoft.app'

export const PIN_LENGTH = 6

// Documento público que solo dice si el PIN ya se configuró
const SETUP_DOC = doc(db, 'meta', 'security')

export const authState = reactive({
  ready: false,
  unlocked: false
})

// Firebase pide contraseñas de 6+ caracteres; el PIN se envuelve en una fija
function pinToPassword(pin: string): string {
  return `jx-pin-${pin}`
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

// La sesión dura mientras la app esté abierta: al cerrarla se pide el PIN
export async function initAuth() {
  await setPersistence(auth, browserSessionPersistence)

  onAuthStateChanged(auth, user => {
    authState.unlocked = user?.email === OWNER_EMAIL
    authState.ready = true
  })
}

export async function isPinConfigured(): Promise<boolean> {
  const snap = await getDoc(SETUP_DOC)
  return snap.exists() && snap.data().configured === true
}

export async function setupPin(pin: string) {
  const { user } = await createUserWithEmailAndPassword(auth, OWNER_EMAIL, pinToPassword(pin))

  await setDoc(SETUP_DOC, {
    configured: true,
    uid: user.uid,
    createdAt: new Date().toISOString()
  })
}

export async function loginWithPin(pin: string) {
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, pinToPassword(pin))
}

export async function changePin(currentPin: string, newPin: string) {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')

  const credential = EmailAuthProvider.credential(OWNER_EMAIL, pinToPassword(currentPin))
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, pinToPassword(newPin))
}

export async function lockApp() {
  await signOut(auth)
}

// Mensaje claro para los errores de Firebase Auth
export function pinErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || ''

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials') {
    return 'PIN incorrecto'
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo'
  }
  if (code === 'auth/network-request-failed') {
    return 'Sin conexión a internet'
  }
  if (code === 'auth/email-already-in-use') {
    return 'El PIN ya está configurado. Ingresa con tu PIN'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Falta activar el acceso con correo y contraseña en Firebase'
  }
  return 'No se pudo completar. Intenta de nuevo'
}
