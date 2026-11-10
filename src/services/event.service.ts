import { addDoc, deleteDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { userCollection, userDoc } from '@/firebase/dataRoot'
import type { SpendingEvent } from '@/interfaces'

// Viajes y eventos del usuario: users/{uid}/events
const COLLECTION = 'events'

export const getEventsService = async () => {
  const snapshot = await getDocs(userCollection(COLLECTION))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SpendingEvent[]
}

export const createEventService = async (event: Omit<SpendingEvent, 'id'>) => {
  const ref = await addDoc(userCollection(COLLECTION), event)
  return ref.id
}

export const updateEventService = async (id: string, data: Partial<SpendingEvent>) => {
  await updateDoc(userDoc(COLLECTION, id), data)
}

export const deleteEventService = async (id: string) => {
  await deleteDoc(userDoc(COLLECTION, id))
}

// Cambia el evento de varios movimientos de una vez ('' = ninguno).
// Firestore acepta hasta 500 escrituras por lote.
export const setTransactionsEventService = async (ids: string[], eventId: string) => {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db)
    ids.slice(i, i + 450).forEach(id => batch.update(userDoc('transactions', id), { eventId }))
    await batch.commit()
  }
}
