import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'

import type { Budget } from '@/interfaces'

const COLLECTION = 'budgets'

export const getBudgetsService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as Budget[]
}

export const createBudgetService = async (
  recurring: Omit<Budget, 'id'>
) => {

  return await addDoc(
    collection(db, COLLECTION),
    recurring
  )
}

export const updateBudgetService = async (
  id: string,
  data: Partial<Budget>
) => {

  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteBudgetService = async (
  id: string
) => {

  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}
