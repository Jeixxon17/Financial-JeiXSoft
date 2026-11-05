import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { userCollection, userDoc } from '@/firebase/dataRoot'

import type { RecurringExpense } from '@/interfaces'

const COLLECTION = 'recurringExpenses'

export const getRecurringExpensesService = async () => {

  const snapshot = await getDocs(
    userCollection(COLLECTION)
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
    userCollection(COLLECTION),
    recurring
  )
}

export const updateRecurringExpenseService = async (
  id: string,
  data: Partial<RecurringExpense>
) => {

  const ref = userDoc(COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteRecurringExpenseService = async (
  id: string
) => {

  const ref = userDoc(COLLECTION, id)

  await deleteDoc(ref)
}
