// Extracto de la tarjeta de crédito NU (Nu Financiera, Colombia).
//
// Formato (texto por renglones, celdas separadas por " | "):
//   18 NOV 2026 | 29 OCT 2026 | 28 SEP 2026 - 28 OCT      ← límite, corte, periodo
//   PAGO MÍNIMO / $100.000,00
//   DEUDA TOTAL HASTA EL 28 OCTUBRE / $150.000,00
//   24 OCT | Comercio* | $50.000,00 | 1 de 1 | $50.000,00 | 2.09% | $0,00 | ...
//   2026 | Resto Nombre                                    ← año y resto del nombre
//   ↪ Comisión por cambio de moneda | $225,00             ← cargo de la compra anterior
//   24 OCT | Pago | $80.000,00 | -$80.000,00 | $0,00

import type { ParsedStatement, StatementMovement } from './types'

const MONTHS: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12
}
const MONTH = '(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)'
const MONEY_CELL = /^-?\$[\d.]+,\d{2}$/

export function isNuStatement(text: string): boolean {
  return /Nu Financiera|Nu Colombia/i.test(text)
}

// "$1.250,50" / "-$80.000,00" → 1250.5 / 80000 (siempre positivo)
function money(raw: string): number {
  const clean = raw.replace(/[^\d,]/g, '').replace(',', '.')
  return Number(clean) || 0
}

function iso(day: string | number, month: string, year: number): string {
  return `${year}-${String(MONTHS[month]).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function capitalize(text: string): string {
  return text.toLowerCase().replace(/(^|[\s*])\S/g, c => c.toUpperCase()).trim()
}

export function parseNuStatement(pages: string[][]): ParsedStatement {
  const lines = pages.flat().map(l => l.replace(/^\|\s*/, '').trim())
  const text = lines.join('\n')

  // Fechas del resumen
  const dates = text.match(new RegExp(
    `(\\d{1,2}) ${MONTH} (\\d{4})[\\s|]+(\\d{1,2}) ${MONTH} (\\d{4})[\\s|]+(\\d{1,2}) ${MONTH} (\\d{4}) - (\\d{1,2}) ${MONTH}`
  ))
  if (!dates) throw new Error('No se encontraron las fechas del extracto de NU')

  const [, dueD, dueM, dueY, , cutM, cutY, startD, startM, startY, endD, endM] = dates
  const dueDate = iso(dueD, dueM, Number(dueY))
  const periodStart = iso(startD, startM, Number(startY))
  const endYear = MONTHS[endM] < MONTHS[startM] ? Number(startY) + 1 : Number(startY)
  const cutoffDate = iso(endD, endM, endYear)
  const cutoffYear = Number(cutY)

  const amountAfter = (label: RegExp) => {
    const match = text.match(new RegExp(label.source + String.raw`[^$]*?\$([\d.]+,\d{2})`, 'i'))
    return match ? money(match[1]) : 0
  }

  const movements: StatementMovement[] = []
  let last: StatementMovement | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Cargo por conversión de la compra anterior
    const fee = line.match(/^↪\s*Comisi[oó]n por cambio de moneda\s*\|?\s*\$([\d.]+,\d{2})/i)
    if (fee && last) {
      movements.push({
        kind: 'fee',
        date: last.date,
        description: `Comisión cambio de moneda · ${last.description}`,
        amount: money(fee[1]),
        installments: 1,
        interestRate: 0,
        previous: last.previous
      })
      continue
    }

    const row = line.match(new RegExp(`^(\\d{2}) ${MONTH} \\| (.+)$`))
    if (!row) continue

    const [, day, month, rest] = row
    const cells = rest.split(' | ').map(c => c.trim()).filter(Boolean)

    // El renglón siguiente trae el año y, a veces, el resto del nombre
    let year = MONTHS[month] > MONTHS[endM] && MONTHS[month] - MONTHS[endM] > 6 ? cutoffYear - 1 : cutoffYear
    let extra = ''
    const next = lines[i + 1]?.match(/^(\d{4})(?:\s*\|\s*(.+))?$/)
    if (next) {
      year = Number(next[1])
      extra = next[2]?.trim() || ''
      i++
    }

    const name = [cells[0], extra].filter(Boolean).join(' ')
    const moneyCells = cells.filter(c => MONEY_CELL.test(c)).map(money)
    if (!moneyCells.length) continue

    const date = iso(day, month, year)
    const previous = date < periodStart

    if (/^pago$/i.test(cells[0])) {
      last = null
      movements.push({
        kind: 'payment', date, description: 'Pago a la tarjeta',
        amount: moneyCells[0], installments: 1, interestRate: 0, previous
      })
      continue
    }

    const amount = moneyCells[0]
    const cuotas = cells.map(c => c.match(/^(\d+) de (\d+)$/)).find(Boolean)
    const monthCapital = moneyCells[1] || 0
    const installments = cuotas
      ? Number(cuotas[2])
      : monthCapital > 0 ? Math.max(1, Math.round(amount / monthCapital)) : 1
    const rate = cells.map(c => c.match(/^([\d.]+)%$/)).find(Boolean)

    last = {
      kind: 'purchase',
      date,
      description: capitalize(name),
      amount,
      installments,
      // A 1 cuota NU no cobra interés aunque muestre la tasa
      interestRate: installments > 1 && rate ? Number(rate[1]) : 0,
      previous
    }
    movements.push(last)
  }

  return {
    bank: 'nu',
    cutoffDate,
    periodStart,
    dueDate,
    minimumPayment: amountAfter(/PAGO M[IÍ]NIMO/),
    totalDebt: amountAfter(/DEUDA TOTAL HASTA EL/),
    interest: amountAfter(/\nIntereses/),
    conversionFees: amountAfter(/Cargos por conversi[oó]n/),
    movements
  }
}
