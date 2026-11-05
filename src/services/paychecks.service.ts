import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query
} from 'firebase/firestore'

import { userCollection, userDoc } from '@/firebase/dataRoot'

import type {
  Paycheck
} from '@/interfaces'

// =========================================
// COLLECTION
// =========================================

const COLLECTION_NAME = 'paychecks'

// =========================================
// GET
// =========================================

export async function getPaychecksService(): Promise<Paycheck[]> {

  const q = query(
    userCollection(COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map(docu => ({

    id: docu.id,

    ...docu.data()

  })) as Paycheck[]
}

// =========================================
// CREATE
// =========================================

export async function createPaycheckService(
  data: Omit<Paycheck, 'id'>
) {

  await addDoc(
    userCollection(COLLECTION_NAME),
    {
      ...data,
      createdAt: Date.now()
    }
  )
}

// =========================================
// UPDATE
// =========================================

export async function updatePaycheckService(
  id: string,
  updates: Partial<Paycheck>
) {

  const ref = userDoc(COLLECTION_NAME, id)

  await updateDoc(
    ref,
    updates
  )
}

// =========================================
// DELETE
// =========================================

export async function deletePaycheckService(
  id: string
) {

  const ref = userDoc(COLLECTION_NAME, id)

  await deleteDoc(ref)
}