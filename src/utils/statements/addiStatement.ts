// Extracto de ADDI (créditos de compra a cuotas).
//
// No trae cada compra sino cada crédito con lo que se cobra este mes
// (texto por renglones, celdas separadas por " | "):
//   28 de octubre de 2026                                  ← fecha del extracto
//   05 de oct. de 2026 - 04 de nov. de 2026                ← periodo facturado
//   04 de nov. de | $ 100.000,00 | $ 900.000,00             ← límite, mínimo, total
//   Oct. 18 | Comercio | $ 50.000,00 | $ 0,00 | $ 0,00 | $ 0,00 | $ 0,00 | $ 50.000,00
//   2026 | a1b2c3 | 0,00 % E.A.                            ← año, ID y tasa
// Columnas: capital, interés, fianza, interés de mora, cobranza, pago mínimo.

import type { ParsedStatement, PreviousCredit, StatementMovement } from './types'

const MONTHS: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12
}
const MONEY = /\$\s*([\d.]+,\d{2})/g

export function isAddiStatement(text: string): boolean {
  return /soporte@addi\.com|addi\.com|Marketplace Addi|Addi para recuperar/i.test(text)
}

// "$ 1.250,50" → 1250.5
function money(raw: string): number {
  return Number(raw.replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

function monthNumber(name: string): number {
  return MONTHS[name.toLowerCase().slice(0, 3)] || 0
}

function iso(year: number | string, month: number, day: number | string): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function capitalize(text: string): string {
  return text.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).trim()
}

// Tasa efectiva anual → interés mensual (%)
function monthlyRate(annual: number): number {
  return Math.round((Math.pow(1 + annual / 100, 1 / 12) - 1) * 10000) / 100
}

// Créditos sin interés: ADDI divide el valor en cuotas iguales (casi siempre 3).
// Se elige el número de cuotas con el que el total da un valor redondo.
function guessInstallments(capital: number): number {
  for (const n of [3, 2, 4, 6, 1]) {
    const total = capital * n
    if (Math.abs(total - Math.round(total / 100) * 100) <= 1) return n
  }
  return 3
}

export function parseAddiStatement(pages: string[][]): ParsedStatement {
  const lines = pages.flat().map(l => l.replace(/^\|\s*/, '').trim())
  const text = lines.join('\n')

  // Fecha del extracto. ADDI no tiene corte fijo: en la app el corte es el día
  // configurado en la cuenta (entran las compras de ~15 días antes del pago)
  const issued = text.match(/(\d{1,2}) de ([a-zé]+) de (\d{4})/i)
  if (!issued) throw new Error('No se encontró la fecha del extracto de ADDI')
  const cutoffDate = iso(issued[3], monthNumber(issued[2]), issued[1])
  const year = Number(issued[3])

  // Compras desde el extracto anterior (mismo día del mes pasado)
  const prev = new Date(`${cutoffDate}T12:00:00`)
  prev.setMonth(prev.getMonth() - 1)
  const periodStart = addDays(iso(prev.getFullYear(), prev.getMonth() + 1, prev.getDate()), 1)

  const period = text.match(/\d{1,2} de [a-z]+\.? de \d{4} - (\d{1,2}) de ([a-z]+)\.? de (\d{4})/i)
  const due = text.match(/Fecha l[ií]mite de pago[^\n]*\n(\d{1,2}) de ([a-z]+)\.? de[^\n]*\n(\d{4})/i)
  const dueDate = due
    ? iso(due[3], monthNumber(due[2]), due[1])
    : period ? iso(period[3], monthNumber(period[2]), period[1]) : cutoffDate

  // Renglón con el mínimo y el total: los dos valores que siguen a la fecha límite
  const amountsLine = lines.find((l, i) => /Tu pago total/i.test(lines[i - 1] || '') && /\$\s*[\d.]+,\d{2}/.test(l)) || ''
  const headerAmounts = [...amountsLine.matchAll(MONEY)].map(m => money(m[1]))
  const minimumMatch = text.match(/Tu pago m[ií]nimo del mes[\s|]*\$\s*([\d.]+,\d{2})/i)

  const movements: StatementMovement[] = []
  const previousCredits: PreviousCredit[] = []
  let interest = 0
  let bond = 0

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].match(/^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sept?|Oct|Nov|Dic)\.? (\d{1,2}) \| (.+)$/i)
    if (!row) continue

    const cells = row[3].split(' | ').map(c => c.trim()).filter(Boolean)
    const amounts = cells.filter(c => /^\$\s*[\d.]+,\d{2}$/.test(c)).map(money)
    if (amounts.length < 6) continue
    const [capital, rowInterest, rowBond] = amounts
    const name = capitalize(cells[0])

    // Año y tasa vienen en los dos renglones siguientes
    const after = lines.slice(i + 1, i + 3).join(' | ')
    const rowYear = Number(after.match(/(?:^|\|\s*)(\d{4})(?:\s*\||$)/)?.[1]) || year
    const annual = Number(after.match(/([\d,]+)\s*%\s*E\.A/i)?.[1].replace(',', '.')) || 0
    const date = iso(rowYear, monthNumber(row[1]), row[2])

    interest += rowInterest
    bond += rowBond

    if (annual === 0) {
      // Sin interés: el valor de la compra es la cuota por el número de cuotas
      const installments = guessInstallments(capital)
      movements.push({
        kind: 'purchase',
        date,
        description: `${name} (ADDI)`,
        amount: Math.round(capital * installments),
        installments,
        interestRate: 0,
        previous: date < periodStart
      })
    } else {
      // Con interés el extracto no dice el valor ni las cuotas: va en el saldo sin detalle
      previousCredits.push({ date, description: name, monthlyCapital: capital, interestRate: monthlyRate(annual) })
    }
  }

  if (bond > 0) {
    movements.push({
      kind: 'fee', date: cutoffDate, description: 'Servicio de fianza ADDI',
      amount: Math.round(bond * 100) / 100, installments: 1, interestRate: 0, previous: false
    })
  }

  return {
    bank: 'addi',
    cutoffDate,
    periodStart,
    dueDate,
    minimumPayment: minimumMatch ? money(minimumMatch[1]) : headerAmounts[0] || 0,
    totalDebt: headerAmounts[1] || 0,
    interest: Math.round(interest * 100) / 100,
    conversionFees: 0,
    movements,
    previousCredits,
    debtIncludesUnbilled: true
  }
}
