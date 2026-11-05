import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { userCollection, userDoc } from '@/firebase/dataRoot'

import type { Budget } from '@/interfaces'

const COLLECTION = 'budgets'

export const getBudgetsService = async () => {

  const snapshot = await getDocs(
    userCollection(COLLECTION)
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
    userCollection(COLLECTION),
    recurring
  )
}

export const updateBudgetService = async (
  id: string,
  data: Partial<Budget>
) => {

  const ref = userDoc(COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteBudgetService = async (
  id: string
) => {

  const ref = userDoc(COLLECTION, id)

  await deleteDoc(ref)
}
