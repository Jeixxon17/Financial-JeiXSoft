import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { userCollection, userDoc } from '@/firebase/dataRoot'

import type { SavingsGoal } from '@/interfaces'

const COLLECTION = 'savingsGoals'

export const getSavingsGoalsService = async () => {

  const snapshot = await getDocs(
    userCollection(COLLECTION)
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
    userCollection(COLLECTION),
    recurring
  )
}

export const updateSavingsGoalService = async (
  id: string,
  data: Partial<SavingsGoal>
) => {

  const ref = userDoc(COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteSavingsGoalService = async (
  id: string
) => {

  const ref = userDoc(COLLECTION, id)

  await deleteDoc(ref)
}
