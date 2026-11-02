import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'

import type { PendingTransaction } from '@/interfaces'

const COLLECTION = 'pendingTransactions'

export const getPendingTransactionsService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as PendingTransaction[]
}

export const deletePendingTransactionService = async (
  id: string
) => {

  await deleteDoc(
    doc(db, COLLECTION, id)
  )
}

// Con el mismo id del lector: si ya estaba en "Por confirmar" no se duplica
export const savePendingTransactionService = async (
  item: PendingTransaction
) => {

  const { id, ...data } = item

  await setDoc(
    doc(db, COLLECTION, id),
    data
  )
}
