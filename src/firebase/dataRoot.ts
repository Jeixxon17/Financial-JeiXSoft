import { collection, doc } from 'firebase/firestore'
import { db } from './config'

// Dónde viven los datos del usuario que inició sesión:
// - Cada usuario: users/{uid}/accounts, users/{uid}/transactions…
// - La cuenta anterior del dueño (v1), mientras no actualice su acceso: las
//   colecciones generales (accounts, transactions…). Se conservan de respaldo.
let uid: string | null = null

export function setDataRoot(userId: string | null) {
  uid = userId
}

export const dataRootUid = () => uid

export const userCollection = (name: string) => (uid ? collection(db, 'users', uid, name) : collection(db, name))

export const userDoc = (name: string, id: string) => (uid ? doc(db, 'users', uid, name, id) : doc(db, name, id))

// Ruta de la colección para el lector nativo de Android (sube por REST)
export const userCollectionPath = (name: string) => (uid ? `users/${uid}/${name}` : name)
