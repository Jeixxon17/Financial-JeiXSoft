import { collection, doc } from 'firebase/firestore'
import { db } from './config'

// Los datos del usuario que inició sesión viven en users/{uid}/accounts,
// users/{uid}/transactions… (las reglas de Firestore solo le dejan ver lo suyo)
let uid: string | null = null

// Colecciones de cada usuario (eliminar la cuenta las borra todas)
export const USER_COLLECTIONS = [
  'accounts',
  'transactions',
  'categories',
  'paychecks',
  'recurringExpenses',
  'pendingTransactions',
  'budgets',
  'savingsGoals'
] as const

export function setDataRoot(userId: string | null) {
  uid = userId
}

function currentUid(): string {
  if (!uid) throw new Error('Sin sesión: no hay datos de usuario')
  return uid
}

export const userCollection = (name: string) => collection(db, 'users', currentUid(), name)

export const userDoc = (name: string, id: string) => doc(db, 'users', currentUid(), name, id)

// Ruta de la colección para el lector nativo de Android (sube por REST)
export const userCollectionPath = (name: string) => `users/${currentUid()}/${name}`
