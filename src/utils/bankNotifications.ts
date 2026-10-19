// Interpreta las notificaciones de Bancolombia para proponer un movimiento.
// Los textos cambian con el tiempo: si una notificación no se entiende, igual
// queda en "Por confirmar" con el texto original para registrarla a mano.
//
// Formatos conocidos (ejemplos reales):
//   Recibiste un pago de Nomina de EMPRESA por $1,887,533.00 en tu cuenta de Ahorros el 30/09/2026 …
//   recibiste una transferencia de NOMBRE por $30,000.00 en tu cuenta *4603 conectada a la llave … el 18/10/26 …
//   pagaste $15,000.00 por codigo QR desde tu cuenta *4603 a la llave … el 30/09/2026 …
//   transferiste $25,700.00 a la llave … desde tu cuenta *4603 a NOMBRE el 30/09/26 …
//   Compraste COP27.800,00 en COMERCIO con tu T.Cred *3162, el 30/09/2026 …
//   Pagaste $559,814.02 a COMERCIO desde tu producto 4603 el 30/09/2026 14:14:27 …

export interface ParsedNotification {
  type: 'income' | 'expense' | null
  amount: number | null
  description: string
  // Últimos 4 dígitos de la cuenta o tarjeta, si vienen en el texto
  last4: string | null
  // Tarjeta de crédito o cuenta (ahorros/corriente), para cuando no hay dígitos
  productKind: 'credit' | 'account' | null
  // Fecha del movimiento según el texto (YYYY-MM-DD)
  date: string | null
  // Id de categoría sugerida (ej: nómina → salary)
  suggestedCategory: string | null
}

const BANK_PACKAGES = ['com.todo1.mobile', 'com.bancolombia', 'co.com.bancolombia']

export function isBankNotification(pkg: string, title: string, text: string): boolean {
  if (BANK_PACKAGES.some(p => pkg.toLowerCase().startsWith(p))) return true
  return /bancolombia/i.test(`${title} ${text}`)
}

const INCOME_WORDS = /\b(recibiste|te consignaron|te transfirieron|te enviaron|abono|abonamos|reembolso)\b/i
const EXPENSE_WORDS = /\b(pagaste|compraste|transferiste|enviaste|retiraste|retiro|debitamos)\b/i

const MONEY = String.raw`(?:\$|COP)\s?[\d.,]*\d`

// "$1,887,533.00", "COP27.800,00", "$ 70.000" → número
export function parseCOP(raw: string): number | null {
  let value = raw.replace(/[^\d.,]/g, '')
  if (!value) return null

  // Decimales al final (2 dígitos tras el último separador)
  const decimals = value.match(/[.,](\d{2})$/)
  if (decimals) value = value.slice(0, -3)

  const integer = Number(value.replace(/[.,]/g, ''))
  if (!Number.isFinite(integer)) return null

  return integer + (decimals ? Number(decimals[1]) / 100 : 0)
}

// "30/09/2026" o "30/09/26" → "2026-09-30"
function parseDate(text: string): string | null {
  const m = text.match(/\bel (\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/i)
  if (!m) return null

  const [, d, mo, y] = m
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function findDescription(text: string, type: ParsedNotification['type']): string {
  const patterns: RegExp[] = [
    // Recibiste … de NOMBRE por $X
    ...(type === 'income' ? [new RegExp(String.raw`\b(?:recibiste|te \w+)\b.*?\bde (.+?) por ${MONEY}`, 'i')] : []),
    // Compraste $X en COMERCIO con tu …
    new RegExp(String.raw`${MONEY} en (.+?)(?: con tu\b|,|\.|$)`, 'i'),
    // transferiste $X a la llave … desde tu cuenta *1234 a NOMBRE el …
    /desde tu (?:cuenta|producto) \*?\d{4} a (?!la llave)(.+?) el \d/i,
    // Pagaste $X a COMERCIO desde tu …
    new RegExp(String.raw`${MONEY} a (?!la llave)(.+?) desde tu\b`, 'i')
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return capitalize(match[1].trim())
  }

  if (/c[oó]digo QR/i.test(text)) return 'Pago con código QR'
  if (/\bllave\b/i.test(text)) return type === 'income' ? 'Transferencia recibida' : 'Transferencia por llave'
  return ''
}

export function parseBankNotification(title: string, text: string): ParsedNotification {
  // El título suele ser "Bancolombia"; el contenido está en el texto
  const full = text.replace(/\s+/g, ' ').replace(/^\s*Bancolombia:\s*/i, '').trim() || title

  const amountMatch = full.match(new RegExp(MONEY, 'i'))
  const amount = amountMatch ? parseCOP(amountMatch[0]) : null

  let type: ParsedNotification['type'] = null
  if (INCOME_WORDS.test(full)) type = 'income'
  else if (EXPENSE_WORDS.test(full)) type = 'expense'

  const last4Match = full.match(/(?:\*|\bproducto\s)(\d{4})\b/i)
  const last4 = last4Match ? last4Match[1] : null

  let productKind: ParsedNotification['productKind'] = null
  if (/\bT\.?\s?Cred\b|tarjeta de cr[eé]dito/i.test(full)) productKind = 'credit'
  else if (/\b(cuenta|producto|ahorros)\b/i.test(full)) productKind = 'account'

  const suggestedCategory = type === 'income' && /\bn[oó]mina\b/i.test(full) ? 'salary' : null

  return {
    type,
    amount,
    description: findDescription(full, type),
    last4,
    productKind,
    date: parseDate(full),
    suggestedCategory
  }
}

function capitalize(text: string) {
  const lower = text.toLowerCase()
  return lower.replace(/(^|\s)\S/g, c => c.toUpperCase())
}
