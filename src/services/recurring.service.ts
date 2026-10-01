import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'

import type { RecurringExpense } from '@/interfaces'

const COLLECTION = 'recurringExpenses'

export const getRecurringExpensesService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as RecurringExpense[]
}

export const createRecurringExpenseService = async (
  recurring: Omit<RecurringExpense, 'id'>
) => {

  return await addDoc(
    collection(db, COLLECTION),
    recurring
  )
}

export const updateRecurringExpenseService = async (
  id: string,
  data: Partial<RecurringExpense>
) => {

  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteRecurringExpenseService = async (
  id: string
) => {

  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}
