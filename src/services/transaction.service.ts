import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'

import type { Transaction } from '@/interfaces'

const COLLECTION = 'transactions'

export const getTransactionsService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as Transaction[]
}

export const createTransactionService = async (
  transaction: Omit<Transaction, 'id'>
) => {

  return await addDoc(
    collection(db, COLLECTION),
    transaction
  )
}

// Crea con un id fijo: si ya existe, la sobrescribe en vez de duplicarla
export const setTransactionService = async (
  id: string,
  transaction: Omit<Transaction, 'id'>
) => {

  await setDoc(
    doc(db, COLLECTION, id),
    transaction
  )
}

export const updateTransactionService = async (
  id: string,
  data: Partial<Transaction>
) => {

  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteTransactionService = async (
  id: string
) => {

  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}