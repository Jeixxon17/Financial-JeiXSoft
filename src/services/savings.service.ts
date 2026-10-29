import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'

import type { SavingsGoal } from '@/interfaces'

const COLLECTION = 'savingsGoals'

export const getSavingsGoalsService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as SavingsGoal[]
}

export const createSavingsGoalService = async (
  recurring: Omit<SavingsGoal, 'id'>
) => {

  return await addDoc(
    collection(db, COLLECTION),
    recurring
  )
}

export const updateSavingsGoalService = async (
  id: string,
  data: Partial<SavingsGoal>
) => {

  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteSavingsGoalService = async (
  id: string
) => {

  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}
