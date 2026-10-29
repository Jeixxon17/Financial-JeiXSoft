// Compara los movimientos del extracto con los que ya están en la app, para
// no duplicar nada: mismo monto (±1 peso) y fecha cercana.

import type { Category, Transaction } from '@/interfaces'
import { daysBetween, parseISODate } from '@/utils/dates'
import type { ParsedStatement, StatementMovement } from './types'

export type RowStatus = 'matched' | 'new'

export interface ImportRow {
  key: string
  movement: StatementMovement
  status: RowStatus
  // Movimiento de la app que corresponde (si ya estaba)
  match?: Transaction
  include: boolean
  category: string
  // Pagos nuevos: cuenta desde la que se pagó (se registra como transferencia)
  sourceAccountId: string
}

// Días de diferencia aceptados entre la fecha del banco y la registrada
const DATE_TOLERANCE = 5

function daysApart(a: string, b: string): number {
  return Math.abs(daysBetween(parseISODate(a), parseISODate(b)))
}

function keyword(description: string): string {
  return description.toLowerCase().replace(/[^a-z0-9áéíóúñ ]/g, ' ').trim().split(/\s+/)[0] || ''
}

/** Categoría sugerida: la que usaste antes con un nombre parecido. */
function guessCategory(
  movement: StatementMovement,
  history: Transaction[],
  categories: Category[],
  feesCategoryId: string
): string {
  if (movement.kind === 'fee' || movement.kind === 'interest') return feesCategoryId
  if (movement.kind === 'payment') return 'transfer'

  const word = keyword(movement.description)
  const previous = [...history]
    .filter(t => t.type === 'expense' && t.category !== 'transfer' && word && keyword(t.description || '') === word)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (previous) return previous.category

  const byName = (name: string) => categories.find(c => c.name.toLowerCase() === name)?.id
  if (/netflix|spotify|youtube|google|anthropic|claude|playstation|disney|prime|apple/i.test(movement.description)) {
    return byName('mensualidades') || byName('servicios') || 'other'
  }
  return 'other'
}

export function buildImportRows(
  statement: ParsedStatement,
  accountTxs: Transaction[],
  allTxs: Transaction[],
  categories: Category[],
  feesCategoryId: string,
  defaultSourceAccountId: string
): ImportRow[] {
  const used = new Set<string>()
  const movements: StatementMovement[] = [...statement.movements]

  // Los intereses del mes van como un movimiento más (fecha de corte)
  if (statement.interest > 0) {
    movements.push({
      kind: 'interest',
      date: statement.cutoffDate,
      description: 'Intereses corrientes',
      amount: statement.interest,
      installments: 1,
      interestRate: 0,
      previous: false
    })
  }

  const findMatch = (m: StatementMovement, maxDays: number) =>
    accountTxs.find(t =>
      !used.has(t.id) &&
      t.type === (m.kind === 'payment' ? 'income' : 'expense') &&
      Math.abs(t.amount - m.amount) <= 1 &&
      daysApart(t.date, m.date) <= maxDays
    )

  return movements.map((movement, index) => {
    // Primero fecha cercana; si no, el mismo monto en cualquier fecha del periodo
    const match = findMatch(movement, DATE_TOLERANCE) || findMatch(movement, 40)
    if (match) used.add(match.id)

    return {
      key: `${index}-${movement.date}-${movement.amount}`,
      movement,
      status: match ? 'matched' : 'new',
      match,
      include: !match,
      category: guessCategory(movement, allTxs, categories, feesCategoryId),
      sourceAccountId: defaultSourceAccountId
    }
  })
}

/**
 * Movimientos de la app que no aparecen en el extracto.
 * - inPeriod: dentro del periodo (antes del día de corte): para revisar.
 * - nextPeriod: del día del corte hasta la fecha del extracto; el banco los
 *   cobra en el siguiente extracto.
 */
export function unmatchedTxs(
  statement: ParsedStatement,
  accountTxs: Transaction[],
  rows: ImportRow[],
  billingCutoff: string = statement.cutoffDate
) {
  const matched = new Set(rows.filter(r => r.match).map(r => r.match!.id))
  const unmatched = accountTxs
    .filter(t => t.date >= statement.periodStart && t.date <= statement.cutoffDate && !matched.has(t.id))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    inPeriod: unmatched.filter(t => t.date < billingCutoff),
    nextPeriod: unmatched.filter(t => t.date >= billingCutoff)
  }
}

/** Efecto en la deuda (compras suman, pagos restan). */
export function debtEffect(txs: Transaction[]): number {
  return txs.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : t.type === 'income' ? sum - t.amount : sum, 0)
}
