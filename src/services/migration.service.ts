import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

// Colecciones de la v1 (generales) que pasan a users/{uid}/…
export const LEGACY_COLLECTIONS = [
  'accounts',
  'transactions',
  'categories',
  'paychecks',
  'recurringExpenses',
  'pendingTransactions',
  'budgets',
  'savingsGoals'
] as const

export interface MigrationProgress {
  collection: string
  copied: number
  total: number
}

// Cuántos documentos había en la v1 y cuántos quedaron en el espacio del usuario
export interface MigrationCheck {
  collection: string
  original: number
  copied: number
  ok: boolean
}

// Copia los datos de la cuenta anterior a users/{uid}/… con los mismos ids.
// Los originales NO se borran: quedan de respaldo en las colecciones generales.
// Antes de marcar el perfil como migrado vuelve a leer lo copiado y comprueba que
// cada documento de la v1 exista en el espacio nuevo. Si falta algo, no marca nada
// (la app sigue usando los datos de la v1) y se puede volver a intentar sin duplicar:
// los ids son los mismos, así que copiar otra vez solo sobrescribe.
export async function migrateLegacyData(displayName: string, onProgress?: (p: MigrationProgress) => void): Promise<MigrationCheck[]> {
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')

  const snapshots = await Promise.all(LEGACY_COLLECTIONS.map(name => getDocs(collection(db, name))))
  const total = snapshots.reduce((s, snap) => s + snap.size, 0)
  let copied = 0

  for (const [i, name] of LEGACY_COLLECTIONS.entries()) {
    const docs = snapshots[i].docs
    // Firestore acepta hasta 500 escrituras por lote
    for (let start = 0; start < docs.length; start += 400) {
      const batch = writeBatch(db)
      docs.slice(start, start + 400).forEach(d => batch.set(doc(db, 'users', user.uid, name, d.id), d.data()))
      await batch.commit()
      copied += Math.min(400, docs.length - start)
      onProgress?.({ collection: name, copied, total })
    }
  }

  // Verificación: se lee de nuevo lo copiado y se busca cada id de la v1
  const checks = await Promise.all(
    LEGACY_COLLECTIONS.map(async (name, i) => {
      const target = await getDocs(collection(db, 'users', user.uid, name))
      const ids = new Set(target.docs.map(d => d.id))
      const original = snapshots[i].size
      const found = snapshots[i].docs.filter(d => ids.has(d.id)).length
      return { collection: name, original, copied: found, ok: found === original }
    })
  )
  if (checks.some(c => !c.ok)) {
    throw Object.assign(new Error('migration-incomplete'), { code: 'tp/migration-incomplete', checks })
  }

  await setDoc(
    doc(db, 'users', user.uid),
    { name: displayName.trim(), email: user.email, migrated: true, migratedAt: new Date().toISOString() },
    { merge: true }
  )
  return checks
}
