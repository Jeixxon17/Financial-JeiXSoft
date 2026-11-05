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

// Copia los datos de la cuenta anterior a users/{uid}/… con los mismos ids.
// Los originales NO se borran: quedan de respaldo en las colecciones generales.
// Al terminar marca el perfil como migrado: desde ahí la app usa users/{uid}.
export async function migrateLegacyData(displayName: string, onProgress?: (p: MigrationProgress) => void): Promise<number> {
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

  await setDoc(
    doc(db, 'users', user.uid),
    { name: displayName.trim(), email: user.email, migrated: true, migratedAt: new Date().toISOString() },
    { merge: true }
  )
  return copied
}
