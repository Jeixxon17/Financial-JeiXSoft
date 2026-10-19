import { Capacitor } from '@capacitor/core'
import { NotificationsListener, type AndroidNotification } from 'capacitor-notifications-listener'

import type { PendingTransaction } from '@/interfaces'
import { authState } from '@/services/auth.service'
import { setPendingTransactionService } from '@/services/pending.service'
import { isBankNotification, parseBankNotification } from '@/utils/bankNotifications'

// Solo en la app Android: el navegador no puede leer notificaciones de otras apps
export const canReadNotifications = Capacitor.getPlatform() === 'android'

// Cola en el celular: lo que llega con la app bloqueada espera aquí hasta el PIN
const QUEUE_KEY = 'jx-notifications-queue'

let started = false
let onNewPending: (() => void) | null = null

function readQueue(): PendingTransaction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeQueue(queue: PendingTransaction[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Sin almacenamiento: se reintenta con la siguiente notificación
  }
}

// Id estable a partir del texto: la misma notificación nunca se duplica, aunque
// llegue dos veces (push de la app y SMS). El texto trae fecha y hora.
function notificationId(text: string): string {
  const source = text.replace(/\s+/g, ' ').trim().toLowerCase()
  let hash = 5381
  for (let i = 0; i < source.length; i++) hash = ((hash * 33) ^ source.charCodeAt(i)) >>> 0
  return `ntf_${hash.toString(36)}_${source.length}`
}

function toPending(n: AndroidNotification): PendingTransaction {
  const text = n.textlines?.length ? n.textlines.join(' ') : n.text || ''
  const parsed = parseBankNotification(n.title || '', text)

  return {
    id: notificationId(text),
    package: n.package,
    title: n.title || '',
    text,
    receivedAt: new Date(n.time || Date.now()).toISOString(),
    ...parsed
  }
}

// Sube la cola a Firestore ("Por confirmar") si la app está desbloqueada
export async function flushNotificationQueue() {
  if (!authState.unlocked) return

  const queue = readQueue()
  if (!queue.length) return

  const remaining: PendingTransaction[] = []
  for (const item of queue) {
    try {
      await setPendingTransactionService(item)
    } catch {
      remaining.push(item)
    }
  }

  writeQueue(remaining)
  if (remaining.length < queue.length) onNewPending?.()
}

function handleNotification(n: AndroidNotification) {
  const text = n.textlines?.length ? n.textlines.join(' ') : n.text || ''
  if (!isBankNotification(n.package || '', n.title || '', text)) return

  const pending = toPending(n)
  const queue = readQueue()
  if (queue.some(q => q.id === pending.id)) return

  writeQueue([...queue, pending])
  flushNotificationQueue()
}

// Se llama al desbloquear la app. Escucha las nuevas y recupera las que
// llegaron con la app cerrada (el plugin las guarda en el celular).
export async function startNotificationListener(onPending: () => void) {
  onNewPending = onPending
  if (!canReadNotifications) return

  if (!started) {
    started = true
    await NotificationsListener.addListener('notificationReceivedEvent', handleNotification)
    await NotificationsListener.startListening({ cacheNotifications: true })
  }

  await NotificationsListener.restoreCachedNotifications()
  await flushNotificationQueue()
}

export async function notificationPermissionGranted(): Promise<boolean> {
  if (!canReadNotifications) return false
  const { value } = await NotificationsListener.isPermissionGranted()
  return value
}

// Abre Ajustes > Acceso a notificaciones para activar la app
export async function requestNotificationPermission() {
  if (!canReadNotifications) return
  await NotificationsListener.requestPermission({ forceOpenSettings: true })
}
