import { Capacitor, registerPlugin } from '@capacitor/core'
import { onIdTokenChanged } from 'firebase/auth'

import { auth } from '@/firebase/config'
import { watch } from 'vue'
import { authState } from '@/services/auth.service'
import { hasConsent } from '@/services/consent.service'
import { userCollectionPath } from '@/firebase/dataRoot'
import type { PendingTransaction } from '@/interfaces'

// Lector nativo (android/.../notifications): guarda las notificaciones de
// Bancolombia y NU aunque la app esté cerrada y las sube solo a Firestore
interface NotificationStatus {
  permission: boolean
  battery: boolean
  session: boolean
  queued: number
}

interface BankNotificationsPlugin {
  getStatus(): Promise<NotificationStatus>
  openPermissionSettings(): Promise<void>
  requestIgnoreBatteryOptimizations(): Promise<void>
  setSession(options: { apiKey: string; projectId: string; refreshToken: string; collectionPath: string }): Promise<void>
  clearSession(): Promise<void>
  flush(): Promise<void>
  readBankSms(options: { from: number; to: number }): Promise<{ messages: PendingTransaction[] }>
}

const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications')

// Solo en la app Android: el navegador no puede leer notificaciones de otras apps
export const canReadNotifications = Capacitor.getPlatform() === 'android'

let watching = false

// Cada vez que cambia el usuario o Firebase renueva la sesión, se le entrega al
// lector nativo (con la colección de ese usuario) para subir sin abrir la app
function pushSession() {
  if (!authState.ready) return
  const user = auth.currentUser
  // Solo con sesión, el plan Completo y la autorización del usuario. Si falta algo (cerró
  // sesión, retiró la autorización, eliminó la cuenta) el lector olvida la sesión y la cola
  if (!user?.refreshToken || authState.plan !== 'completo' || !hasConsent('notifications')) {
    BankNotifications.clearSession().catch(() => {})
    return
  }
  BankNotifications.setSession({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    refreshToken: user.refreshToken,
    collectionPath: userCollectionPath('pendingTransactions')
  }).catch(error => console.error('Error guardando sesión de notificaciones', error))
}

export function watchNotificationSession() {
  if (!canReadNotifications || watching) return
  watching = true
  onIdTokenChanged(auth, () => pushSession())
  watch(() => [authState.ready, authState.uid, authState.legacy, authState.plan, authState.consents.notifications], () => pushSession())
}
export async function getNotificationStatus(): Promise<NotificationStatus | null> {
  if (!canReadNotifications) return null
  return BankNotifications.getStatus()
}

// Abre Ajustes > Acceso a notificaciones para activar la app
export async function openNotificationSettings() {
  if (canReadNotifications) await BankNotifications.openPermissionSettings()
}

export async function requestBatteryExemption() {
  if (canReadNotifications) await BankNotifications.requestIgnoreBatteryOptimizations()
}

// Sube lo que haya pendiente en el celular
export async function flushNotifications() {
  if (canReadNotifications) await BankNotifications.flush()
}

// SMS del banco guardados en el celular entre dos fechas (YYYY-MM-DD, ambas
// incluidas). Android pide el permiso de leer SMS la primera vez
export async function readBankSms(fromISO: string, toISO: string): Promise<PendingTransaction[]> {
  if (!canReadNotifications) return []
  const from = new Date(`${fromISO}T00:00:00`).getTime()
  const to = new Date(`${toISO}T23:59:59.999`).getTime()
  const { messages } = await BankNotifications.readBankSms({ from, to })
  return messages
}
