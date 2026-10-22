import { Capacitor, registerPlugin } from '@capacitor/core'
import { onIdTokenChanged } from 'firebase/auth'

import { auth } from '@/firebase/config'
import { OWNER_EMAIL } from '@/services/auth.service'

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
  setSession(options: { apiKey: string; projectId: string; refreshToken: string }): Promise<void>
  flush(): Promise<void>
}

const BankNotifications = registerPlugin<BankNotificationsPlugin>('BankNotifications')

// Solo en la app Android: el navegador no puede leer notificaciones de otras apps
export const canReadNotifications = Capacitor.getPlatform() === 'android'

let watching = false

// Cada vez que Firebase renueva la sesión del dueño (PIN, cambio de PIN,
// renovación del token) se le entrega al lector nativo para subir sin abrir la app
export function watchNotificationSession() {
  if (!canReadNotifications || watching) return
  watching = true

  onIdTokenChanged(auth, user => {
    if (user?.email !== OWNER_EMAIL || !user.refreshToken) return

    BankNotifications.setSession({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      refreshToken: user.refreshToken
    }).catch(error => console.error('Error guardando sesión de notificaciones', error))
  })
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
