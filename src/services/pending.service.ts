import {
  collection,
  deleteDoc,
  doc,
  getDocs
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
