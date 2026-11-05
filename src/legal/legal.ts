// ─────────────────────────────────────────────────────────────────────────────
// Temas legales de TuPlataAlDia (Colombia).
//
// - Términos y condiciones y Política de tratamiento de datos (Ley 1581 de 2012,
//   Decreto 1074 de 2015, Ley 1480 de 2011): textos en documents.ts.
// - Autorizaciones: se piden en la app y se guardan en users/{uid}.consents con la
//   versión y la fecha (prueba de la autorización, art. 9 Ley 1581). Si cambia la
//   versión de los términos o la política, la app pide aceptarlos de nuevo.
// - Los datos del responsable salen del .env (no van en el código).
// ─────────────────────────────────────────────────────────────────────────────

// Cambiar la fecha cuando cambie el texto: la app vuelve a pedir la aceptación
export const TERMS_VERSION = '2026-11-05'
export const PRIVACY_VERSION = '2026-11-05'

const env = (key: string) => ((import.meta.env[key] as string | undefined) || '').trim()

// Responsable del tratamiento y proveedor del servicio (art. 50 Ley 1480: identificarse)
export const legalOwner = {
  name: env('VITE_LEGAL_NAME') || 'JeiXSoft',
  id: env('VITE_LEGAL_ID'),
  city: env('VITE_LEGAL_CITY'),
  email: env('VITE_LEGAL_EMAIL'),
  phone: env('VITE_LEGAL_PHONE')
}

export type ConsentKey = 'terms' | 'privacy' | 'statements' | 'notifications' | 'sms'

export interface ConsentRecord {
  version: string
  acceptedAt: string
  // web, android
  platform: string
}

export type Consents = Partial<Record<ConsentKey, ConsentRecord>>

// Autorizaciones de funciones puntuales (se piden antes de usarlas y se pueden retirar en Perfil)
export interface FeatureConsent {
  version: string
  title: string
  intro: string
  points: string[]
  // Lo que pasa si la retira
  revokeNote: string
}

export const featureConsents: Record<'statements' | 'notifications' | 'sms', FeatureConsent> = {
  statements: {
    version: '2026-11-05',
    title: 'Autorización para leer tus extractos',
    intro:
      'Tus extractos bancarios tienen datos privados: movimientos, saldos, cupos y datos de tu tarjeta. Antes de leerlos necesitamos tu autorización.',
    points: [
      'El PDF se lee en este dispositivo. El archivo no se sube ni se guarda en ningún servidor.',
      'La contraseña del PDF solo se usa para abrirlo aquí: no se guarda ni se envía.',
      'Solo se guardan en tu cuenta los movimientos y valores que tú confirmes (mínimo, cupo, deuda y fechas).',
      'Esos datos se usan solo para mostrarte tu tarjeta al día. No se venden ni se comparten para publicidad.'
    ],
    revokeNote: 'Si la retiras, no podrás subir extractos. Lo que ya se guardó sigue en tu cuenta hasta que lo borres.'
  },
  notifications: {
    version: '2026-11-05',
    title: 'Autorización para leer notificaciones del banco',
    intro:
      'Para que tus gastos lleguen solos, la app necesita leer las notificaciones de tu celular. Android te pedirá el permiso "Acceso a notificaciones".',
    points: [
      'Solo se toman las notificaciones de las apps de Bancolombia y Nu, y los SMS que mencionan a esos bancos. Las demás se ignoran en el celular.',
      'De cada aviso se guarda en tu cuenta el texto, la hora y el banco, para que lo confirmes en "Por confirmar".',
      'Funciona aunque la app esté cerrada, solo mientras tengas el plan Completo y la sesión iniciada.',
      'Puedes apagarlo cuando quieras en los ajustes de Android y retirar esta autorización en Perfil.'
    ],
    revokeNote: 'Si la retiras, la app deja de recibir notificaciones. Apaga también el "Acceso a notificaciones" en los ajustes de Android.'
  },
  sms: {
    version: '2026-11-05',
    title: 'Autorización para buscar SMS del banco',
    intro: 'Para traer gastos de días que se te pasaron, la app busca en tus SMS. Android te pedirá el permiso para leer SMS.',
    points: [
      'Solo se toman los SMS del rango de fechas que elijas y que mencionan a Bancolombia o Nu. Los demás no salen del celular.',
      'De cada SMS se guarda en tu cuenta el texto, la fecha y el remitente, para que lo confirmes en "Por confirmar".',
      'Puedes quitar el permiso de SMS en los ajustes de Android y retirar esta autorización en Perfil.'
    ],
    revokeNote: 'Si la retiras, no podrás buscar SMS. Quita también el permiso de SMS en los ajustes de Android.'
  }
}

export const consentLabels: Record<ConsentKey, string> = {
  terms: 'Términos y condiciones',
  privacy: 'Tratamiento de datos personales',
  statements: 'Leer extractos en PDF',
  notifications: 'Leer notificaciones del banco',
  sms: 'Buscar SMS del banco'
}

export const consentVersion = (key: ConsentKey) =>
  key === 'terms' ? TERMS_VERSION : key === 'privacy' ? PRIVACY_VERSION : featureConsents[key].version
