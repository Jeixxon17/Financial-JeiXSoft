import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { auth, db } from '@/firebase/config'
import { USER_COLLECTIONS } from '@/firebase/dataRoot'

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar la cuenta (lo pide Google Play y la Ley 1581: supresión de datos).
// Borra users/{uid}/… (todas las colecciones), el perfil users/{uid} y el usuario
// de Firebase Auth. Los registros de pago (payments/) no los puede borrar la app:
// se conservan por obligación contable, como dice la política de datos.
// ─────────────────────────────────────────────────────────────────────────────

// Cómo confirma su identidad antes de borrar (Firebase lo exige para eliminar el usuario)
export function deletionMethod(): 'password' | 'google' | 'relogin' {
  const providers = auth.currentUser?.providerData.map(p => p.providerId) || []
  if (providers.includes('password')) return 'password'
  if (providers.includes('google.com') && !Capacitor.isNativePlatform()) return 'google'
  return 'relogin'
}

export async function deleteAccount(password?: string) {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')

  // 1. Confirmar que es él (antes de borrar nada)
  const method = deletionMethod()
  if (method === 'password') await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email || '', password || ''))
  else if (method === 'google') await reauthenticateWithPopup(user, new GoogleAuthProvider())
  else {
    // Sin forma de confirmar aquí (Google en Android): Firebase solo deja borrar si entró hace poco.
    // Se revisa antes de borrar los datos, para no dejar la cuenta a medias
    const last = Date.parse(user.metadata.lastSignInTime || '')
    if (!last || Date.now() - last > 4 * 60 * 1000) {
      throw Object.assign(new Error('requires-recent-login'), { code: 'auth/requires-recent-login' })
    }
  }

  // 2. Borrar sus datos
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', user.uid, name))
    for (let start = 0; start < snap.docs.length; start += 400) {
      const batch = writeBatch(db)
      snap.docs.slice(start, start + 400).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, 'users', user.uid))

  // 3. Borrar el usuario (cierra la sesión; el lector de Android olvida la sesión solo)
  await deleteUser(user)
}
