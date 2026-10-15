import type { Account, Transaction } from '@/interfaces'
import { dateInMonth, daysBetween, monthIndexOf, parseISODate, toISODate } from './dates'

export interface CreditStatement {
  lastCutoff: Date | null
  nextCutoff: Date | null
  dueDate: Date | null
  daysToDue: number | null
  minimumPayment: number
  totalBilled: number
  totalPaid: number
  // Mínimo acumulado al próximo corte: lo pendiente más lo que se va facturando
  nextMinimumPayment: number
  // Cargos del banco que no vienen de movimientos (intereses, comisiones...)
  bankCharges: number
  isMinimumCovered: boolean
}

// Corte más reciente ya cerrado (el corte se cierra al final del día de corte)
function lastCutoffBefore(today: Date, cutoffDay: number): Date {
  const thisMonth = dateInMonth(today.getFullYear(), today.getMonth(), cutoffDay)
  if (thisMonth < today) return thisMonth
  return dateInMonth(today.getFullYear(), today.getMonth() - 1, cutoffDay)
}

// Primer corte en o después de la fecha de compra
function firstCutoffFor(purchase: Date, cutoffDay: number): Date {
  const thisMonth = dateInMonth(purchase.getFullYear(), purchase.getMonth(), cutoffDay)
  if (purchase <= thisMonth) return thisMonth
  return dateInMonth(purchase.getFullYear(), purchase.getMonth() + 1, cutoffDay)
}

// Lo facturado por las compras hasta el corte con índice de mes `cutoffIdx`.
// Cada compra se factura por cuotas: la cuota k se cobra en el k-ésimo corte
// desde la fecha de compra.
function billedUntil(accountTxs: Transaction[], cutoffDay: number, cutoffIdx: number): number {
  let total = 0

  accountTxs.forEach(tx => {
    if (tx.type !== 'expense') return

    const firstCutoff = firstCutoffFor(parseISODate(tx.date), cutoffDay)
    const billedCount = cutoffIdx - monthIndexOf(firstCutoff) + 1

    if (billedCount <= 0) return

    const installments = Math.max(1, tx.installments || 1)
    const installmentAmount = tx.installmentAmount || tx.amount / installments

    total += installmentAmount * Math.min(installments, billedCount)
  })

  return total
}

// Movimientos de la tarjeta más la deuda diferida, que se factura como una
// compra a cuotas sin contar como gasto en las estadísticas
export function creditTransactions(account: Account, transactions: Transaction[]): Transaction[] {
  const deferred: Transaction[] = (account.deferredDebts || []).map(d => ({
    id: d.id,
    type: 'expense',
    category: 'deferred',
    accountId: account.id,
    amount: d.amount,
    date: d.date,
    description: d.description,
    tags: [],
    paymentMethod: 'Crédito',
    installments: Math.max(1, d.installments || 1)
  }))

  return [...transactions.filter(t => t.accountId === account.id), ...deferred]
}

function paidUntil(accountTxs: Transaction[], dateISO: string): number {
  return accountTxs
    .filter(tx => tx.type === 'income' && tx.date <= dateISO)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export interface StatementAdjustment {
  // Ajuste a lo facturado (puede ser negativo: compras que el banco difirió)
  billed: number
  // Parte que es deuda nueva (intereses, comisiones); nunca negativa
  debt: number
}

/**
 * Ajustes de los extractos hasta el corte `untilCutoff` (inclusive), según
 * los pagos mínimos reales (`account.statementMinimums`, por fecha de corte).
 * En cada extracto: diferencia = mínimo del extracto − lo que la app calcula.
 *
 * - Diferencia negativa: el banco difirió compras. Bajan lo facturado, pero
 *   se siguen debiendo y quedan pendientes por facturar.
 * - Diferencia positiva: primero es el banco cobrando lo que había diferido;
 *   lo que sobre son intereses o comisiones y sí suma a la deuda.
 */
export function statementAdjustmentsUntil(
  account: Account,
  transactions: Transaction[],
  untilCutoff?: Date
): StatementAdjustment {
  const result: StatementAdjustment = { billed: 0, debt: 0 }
  const minimums = account.statementMinimums
  if (account.type !== 'credit' || !account.cutoffDate || !minimums) return result

  const accountTxs = creditTransactions(account, transactions)
  const limit = untilCutoff ? toISODate(untilCutoff) : '9999-12-31'
  let pendingDeferred = 0

  Object.keys(minimums)
    .filter(cutoffISO => cutoffISO <= limit)
    .sort()
    .forEach(cutoffISO => {
      const cutoffIdx = monthIndexOf(parseISODate(cutoffISO))
      const computed =
        billedUntil(accountTxs, account.cutoffDate!, cutoffIdx) +
        result.billed -
        paidUntil(accountTxs, cutoffISO)

      const difference = minimums[cutoffISO] - Math.max(0, computed)
      result.billed += difference

      if (difference < 0) {
        pendingDeferred -= difference
      } else {
        const fromDeferred = Math.min(difference, pendingDeferred)
        pendingDeferred -= fromDeferred
        result.debt += difference - fromDeferred
      }
    })

  return result
}

/**
 * Calcula el estado de cuenta de una tarjeta de crédito.
 *
 * Lo facturado acumulado hasta el último corte (compras por cuotas más los
 * cargos del banco tomados de los extractos) menos todos los pagos hechos a
 * la tarjeta es el pago mínimo pendiente. Las compras posteriores al corte no
 * entran hasta el siguiente corte.
 */
export function calculateCreditStatement(
  account: Account,
  transactions: Transaction[],
  today: Date = new Date()
): CreditStatement {
  const empty: CreditStatement = {
    lastCutoff: null,
    nextCutoff: null,
    dueDate: null,
    daysToDue: null,
    minimumPayment: 0,
    totalBilled: 0,
    totalPaid: 0,
    nextMinimumPayment: 0,
    bankCharges: 0,
    isMinimumCovered: true
  }

  if (account.type !== 'credit' || !account.cutoffDate) return empty

  const cutoffDay = account.cutoffDate
  const lastCutoff = lastCutoffBefore(today, cutoffDay)
  const nextCutoff = dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, cutoffDay)

  const accountTxs = creditTransactions(account, transactions)

  const adjustment = statementAdjustmentsUntil(account, transactions, lastCutoff)
  const bankCharges = adjustment.debt
  const totalBilled = billedUntil(accountTxs, cutoffDay, monthIndexOf(lastCutoff)) + adjustment.billed
  const totalPaid = paidUntil(accountTxs, '9999-12-31')

  // Fecha límite: el primer día de pago después del corte
  let dueDate: Date | null = null
  if (account.paymentDate) {
    const sameMonth = dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth(), account.paymentDate)
    dueDate = sameMonth > lastCutoff
      ? sameMonth
      : dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, account.paymentDate)
  }

  const minimumPayment = Math.max(0, Math.round(totalBilled - totalPaid))

  const nextBilled =
    billedUntil(accountTxs, cutoffDay, monthIndexOf(nextCutoff)) +
    statementAdjustmentsUntil(account, transactions, nextCutoff).billed
  const nextMinimumPayment = Math.max(0, Math.round(nextBilled - totalPaid))

  return {
    lastCutoff,
    nextCutoff,
    dueDate,
    daysToDue: dueDate ? daysBetween(today, dueDate) : null,
    minimumPayment,
    totalBilled: Math.round(totalBilled),
    totalPaid,
    nextMinimumPayment,
    bankCharges: Math.round(bankCharges),
    isMinimumCovered: minimumPayment === 0
  }
}
