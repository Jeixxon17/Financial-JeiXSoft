import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore'

import { userCollection, userDoc } from '@/firebase/dataRoot'
import type { Account } from '@/interfaces/index'

const COLLECTION = 'accounts'

export const getAccountsService = async () => {
  const snapshot = await getDocs(
    userCollection(COLLECTION)
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
    userCollection(COLLECTION),
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
  const ref = userDoc(COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteAccountService = async (
  id: string
) => {
  const ref = userDoc(COLLECTION, id)

  await deleteDoc(ref)
}