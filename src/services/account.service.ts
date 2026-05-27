import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { db } from '@/firebase/config'
import type { Account } from '@/interfaces/index'

const COLLECTION = 'accounts'

export const getAccountsService = async () => {
  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as Account[]
}

export const createAccountService = async (
  account: Omit<Account, 'id'>
) => {
  return await addDoc(
    collection(db, COLLECTION),
    {
      ...account,
      createdAt: new Date().toISOString()
    }
  )
}

export const updateAccountService = async (
  id: string,
  data: Partial<Account>
) => {
  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteAccountService = async (
  id: string
) => {
  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}