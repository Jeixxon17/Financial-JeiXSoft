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

import type { Category } from '@/interfaces'

const COLLECTION = 'categories'

export const getCategoriesService = async () => {

  const snapshot = await getDocs(
    collection(db, COLLECTION)
  )

  return snapshot.docs.map(docu => ({
    id: docu.id,
    ...docu.data()
  })) as Category[]
}

export const createCategoryService = async (
  category: Omit<Category, 'id'>
) => {

  const ref = await addDoc(
    collection(db, COLLECTION),
    category
  )

  return ref.id
}

// Crea con un id fijo (para conservar el id que ya usan los movimientos)
export const setCategoryService = async (
  id: string,
  category: Omit<Category, 'id'>
) => {

  await setDoc(
    doc(db, COLLECTION, id),
    category
  )
}

export const updateCategoryService = async (
  id: string,
  data: Partial<Category>
) => {

  const ref = doc(db, COLLECTION, id)

  await updateDoc(ref, data)
}

export const deleteCategoryService = async (
  id: string
) => {

  const ref = doc(db, COLLECTION, id)

  await deleteDoc(ref)
}
