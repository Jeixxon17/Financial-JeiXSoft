import { doc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Category } from '@/interfaces'

// Categorías con las que arranca un usuario nuevo (las puede editar o borrar)
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', icon: '🍔', color: '#c5b4ff', type: 'expense' },
  { id: 'mercado', name: 'Mercado', icon: '🛒', color: '#7cc7ff', type: 'expense' },
  { id: 'transporte', name: 'Transporte', icon: '🚌', color: '#7ee6e6', type: 'expense' },
  { id: 'casa', name: 'Casa', icon: '🏠', color: '#ffb38a', type: 'expense' },
  { id: 'servicios', name: 'Servicios', icon: '💡', color: '#f5bd4f', type: 'expense' },
  { id: 'salud', name: 'Salud', icon: '🏥', color: '#4ade96', type: 'expense' },
  { id: 'compras', name: 'Compras', icon: '🛍️', color: '#5f7fe8', type: 'expense' },
  { id: 'salidas', name: 'Salidas', icon: '🎮', color: '#ff9ac4', type: 'expense' },
  { id: 'suscripciones', name: 'Suscripciones', icon: '📺', color: '#b9cbff', type: 'expense' },
  { id: 'educacion', name: 'Educación', icon: '🎓', color: '#a6b0c9', type: 'expense' },
  { id: 'salario', name: 'Salario', icon: '💼', color: '#4ade96', type: 'income' },
  { id: 'otros-ingresos', name: 'Otros ingresos', icon: '💰', color: '#7ee6e6', type: 'income' }
]

// Primera vez de un usuario: sus categorías iniciales en users/{uid}/categories
export async function seedNewUser(uid: string) {
  const batch = writeBatch(db)
  DEFAULT_CATEGORIES.forEach(({ id, ...data }) => batch.set(doc(db, 'users', uid, 'categories', id), data))
  await batch.commit()
}
