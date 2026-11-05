// Enlaces públicos a los documentos legales (rutas con meta.legal en router/index.ts)
export const legalLinks = [
  { to: '/terminos', label: 'Términos y condiciones' },
  { to: '/privacidad', label: 'Política de privacidad' },
  { to: '/eliminar-cuenta', label: 'Eliminar mi cuenta' }
]

export const isLegalPath = (path: string) => legalLinks.some(l => l.to === path)
