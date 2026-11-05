import { computed, reactive } from 'vue'
import { Capacitor } from '@capacitor/core'
import { auth } from '@/firebase/config'
import { authState } from '@/services/auth.service'

// ─────────────────────────────────────────────────────────────────────────────
// Plan Completo: un solo pago de $ 50.000, para siempre (no es mensualidad).
//
// Gratis: Inicio, Movimientos, Cuentas y tarjetas, registrar gastos e ingresos,
// Quincenas, Categorías y Perfil. El resto pide el plan Completo.
//
// El pago lo hace Wompi. El servicio de pagos (payments-worker/, en Cloudflare)
// firma el enlace de pago y, cuando Wompi le avisa que se aprobó, escribe
// users/{uid}.plan = 'completo'. La app escucha el perfil y desbloquea al instante.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_PRICE = 50_000

// Partes que pide el plan Completo
export type ProFeature = 'inbox' | 'budgets' | 'recurring' | 'analytics' | 'statements' | 'advisor'

export const hasFullPlan = computed(() => authState.plan === 'completo')

export interface ProFeatureInfo {
  title: string
  text: string
  points: string[]
}

// Lo que se muestra en cada sección bloqueada
export const proFeatures: Record<ProFeature, ProFeatureInfo> = {
  inbox: {
    title: 'Tus gastos llegan solos',
    text: 'La app lee las notificaciones y SMS de tu banco y te los deja listos para confirmar.',
    points: ['Bancolombia y Nu, sin escribir nada', 'Busca SMS de días que se te pasaron', 'Y todo lo demás del plan Completo']
  },
  budgets: {
    title: 'Tu plan del mes, metas y asesor',
    text: 'Sabe cuánto te queda para gastar, ahorra para lo que quieres y recibe avisos antes de pasarte.',
    points: ['Metas con cuánto ahorrar por quincena', 'Topes de gasto por categoría', 'Asesor que te avisa al gastar']
  },
  recurring: {
    title: 'Tus suscripciones se registran solas',
    text: 'Netflix, el plan del celular, el gimnasio… cada mes en su fecha, incluso los cobros en dólares.',
    points: ['Se registran el día del cobro, sin que hagas nada', 'Dólares con la TRM del día y la comisión de la tarjeta', 'Y todo lo demás del plan Completo']
  },
  analytics: {
    title: 'Cómo va tu plata mes a mes',
    text: 'Ingresos contra gastos, en qué se te va la plata y cómo cierras el mes.',
    points: ['Ingresos y gastos de los últimos meses', 'Gastos por categoría', 'Proyección al final del mes']
  },
  statements: {
    title: 'Tarjetas cuadradas con el banco',
    text: 'Sube el extracto en PDF o escribe lo que dice el banco, y la tarjeta queda igual: mínimo, cupo y deuda.',
    points: ['Lee el extracto en tu celular (no se envía)', 'Agrega lo que falte y cuadra la deuda', 'Y todo lo demás del plan Completo']
  },
  advisor: {
    title: 'Un asesor que te avisa',
    text: 'Te dice si un gasto se sale de tu plan y qué hacer con tus deudas.',
    points: ['Avisos al registrar gastos', 'Consejos con tus propios datos', 'Y todo lo demás del plan Completo']
  }
}

// Lo que se desbloquea (hoja "Mejora tu plan" y pago exitoso)
export const planBenefits = [
  { key: 'inbox', title: 'Gastos que llegan solos', text: 'Lee las notificaciones y SMS del banco' },
  { key: 'budgets', title: 'Presupuesto, metas y asesor', text: 'Plan del mes, topes y avisos al gastar' },
  { key: 'recurring', title: 'Gastos automáticos', text: 'Suscripciones que se registran solas' },
  { key: 'statements', title: 'Extractos y cuadrar con el banco', text: 'Sube el PDF y la tarjeta queda igual' },
  { key: 'analytics', title: 'Estadísticas', text: 'Cómo va tu plata mes a mes' }
] as const

// Hoja "Mejora tu plan" (una sola para toda la app, la pinta App.vue)
export const planUi = reactive({ open: false, from: '' as ProFeature | '' })

export function openUpgrade(from: ProFeature | '' = '') {
  planUi.from = from
  planUi.open = true
}

// Si no tiene el plan abre la hoja y devuelve false; si lo tiene devuelve true
export function requirePlan(feature: ProFeature): boolean {
  if (hasFullPlan.value) return true
  openUpgrade(feature)
  return false
}

// ───────────────────────────── Pago ─────────────────────────────

const PAYMENTS_URL = (import.meta.env.VITE_PAYMENTS_URL as string | undefined)?.replace(/\/$/, '') || ''
export const paymentsConfigured = !!PAYMENTS_URL

// Dónde vuelve Wompi después de pagar
const returnUrl = () => `${window.location.origin}${window.location.pathname}#/plan`

// Pide al servicio de pagos el enlace firmado de Wompi y abre la página de pago
export async function startCheckout() {
  if (!PAYMENTS_URL) throw Object.assign(new Error('payments-not-configured'), { code: 'tp/payments-not-configured' })
  const user = auth.currentUser
  if (!user) throw new Error('not-signed-in')

  // En el servidor local Wompi no acepta volver a localhost: el pago se abre en otra
  // pestaña y la app espera en /plan hasta que el plan cambie. La pestaña se abre
  // ya (antes de esperar al servicio) para que el navegador no la bloquee.
  const local = !Capacitor.isNativePlatform() && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  const tab = local ? window.open('', '_blank') : null

  const res = await fetch(`${PAYMENTS_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    // En Android la app no tiene una dirección web propia: Wompi vuelve a la app web
    // publicada y al regresar a la app el plan ya se ve desbloqueado
    body: JSON.stringify(Capacitor.isNativePlatform() ? {} : { redirectUrl: returnUrl() })
  })
  if (!res.ok) {
    tab?.close()
    throw Object.assign(new Error(await res.text()), { code: 'tp/checkout-failed' })
  }
  const { url, reference } = (await res.json()) as { url: string; reference: string }
  sessionStorage.setItem('tp-plan-reference', reference)

  // En la app Android el pago se abre en el navegador; al volver, el plan ya se ve
  if (Capacitor.isNativePlatform()) window.open(url, '_system')
  else if (local) {
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
    planUi.open = false
    window.location.hash = '#/plan'
  } else window.location.href = url
}

export type TransactionStatus = 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING'

// Estado de una transacción de Wompi (endpoint público, solo lectura)
export async function transactionStatus(id: string): Promise<{ status: TransactionStatus; method?: string } | null> {
  const base = import.meta.env.VITE_WOMPI_ENV === 'production' ? 'https://production.wompi.co' : 'https://sandbox.wompi.co'
  try {
    const res = await fetch(`${base}/v1/transactions/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const { data } = (await res.json()) as { data: { status: TransactionStatus; payment_method_type?: string } }
    return { status: data.status, method: data.payment_method_type }
  } catch {
    return null
  }
}

export const methodName = (type?: string) =>
  ({ NEQUI: 'Nequi', PSE: 'PSE', CARD: 'Tarjeta', BANCOLOMBIA_TRANSFER: 'Botón Bancolombia', BANCOLOMBIA_QR: 'QR Bancolombia' })[type || ''] ||
  type ||
  ''
