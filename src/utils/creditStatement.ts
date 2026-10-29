import type { Account, Transaction } from '@/interfaces'
import { installmentSchedule, installmentsBilled } from './installments'
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
  isMinimumCovered: boolean
}

// Corte más reciente ya cerrado (el corte se cierra al final del día de corte)
function lastCutoffBefore(today: Date, cutoffDay: number): Date {
  const thisMonth = dateInMonth(today.getFullYear(), today.getMonth(), cutoffDay)
  if (thisMonth < today) return thisMonth
  return dateInMonth(today.getFullYear(), today.getMonth() - 1, cutoffDay)
}

// Primer corte después de la fecha de compra. Las compras del mismo día del
// corte ya no alcanzan a salir en ese extracto: entran en el siguiente.
function firstCutoffFor(purchase: Date, cutoffDay: number): Date {
  const thisMonth = dateInMonth(purchase.getFullYear(), purchase.getMonth(), cutoffDay)
  if (purchase < thisMonth) return thisMonth
  return dateInMonth(purchase.getFullYear(), purchase.getMonth() + 1, cutoffDay)
}

// Capital e intereses facturados por las compras hasta el corte con índice de
// mes `cutoffIdx`. La cuota k se cobra en el k-ésimo corte desde la compra.
function billedPartsUntil(
  accountTxs: Transaction[],
  cutoffDay: number,
  cutoffIdx: number
): { capital: number; interest: number } {
  const total = { capital: 0, interest: 0 }

  accountTxs.forEach(tx => {
    if (tx.type !== 'expense') return

    const firstCutoff = firstCutoffFor(parseISODate(tx.date), cutoffDay)
    const billedCount = cutoffIdx - monthIndexOf(firstCutoff) + 1

    if (billedCount <= 0) return

    const billed = installmentsBilled(tx.amount, tx.installments || 1, tx.interestRate || 0, billedCount)
    total.capital += billed.capital
    total.interest += billed.interest
  })

  return total
}

function billedUntil(accountTxs: Transaction[], cutoffDay: number, cutoffIdx: number): number {
  const { capital, interest } = billedPartsUntil(accountTxs, cutoffDay, cutoffIdx)
  return capital + interest
}

// Intereses de las cuotas ya facturadas (hasta el último corte cerrado).
// Son deuda nueva: se suman a lo que se debe de la tarjeta.
export function creditInterestUntil(
  account: Account,
  transactions: Transaction[],
  today: Date = new Date()
): number {
  if (account.type !== 'credit' || !account.cutoffDate) return 0

  const lastCutoff = lastCutoffBefore(today, account.cutoffDate)
  return billedPartsUntil(
    creditTransactions(account, transactions),
    account.cutoffDate,
    monthIndexOf(lastCutoff)
  ).interest
}

/**
 * Deuda de la tarjeta al final del día `untilISO` (YYYY-MM-DD): compras y
 * deuda diferida hasta esa fecha, menos pagos, más los intereses de las
 * cuotas facturadas hasta el corte de ese día. Sirve para cuadrar con la
 * "deuda total al corte" de un extracto.
 */
export function creditDebtUntil(account: Account, transactions: Transaction[], untilISO: string): number {
  if (account.type !== 'credit' || !account.cutoffDate) return 0

  const txs = creditTransactions(account, transactions).filter(t => t.date <= untilISO)
  const dayAfter = parseISODate(untilISO)
  dayAfter.setDate(dayAfter.getDate() + 1)
  const cutoff = lastCutoffBefore(dayAfter, account.cutoffDate)

  const movements = txs.reduce((sum, t) =>
    t.type === 'expense' ? sum + t.amount : t.type === 'income' ? sum - t.amount : sum, 0)
  const interest = billedPartsUntil(txs, account.cutoffDate, monthIndexOf(cutoff)).interest

  return movements + interest
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

// Fecha límite de pago del corte (el primer día de pago después del corte)
function dueDateFor(cutoff: Date, paymentDay?: number): Date {
  if (!paymentDay) return cutoff
  const sameMonth = dateInMonth(cutoff.getFullYear(), cutoff.getMonth(), paymentDay)
  return sameMonth > cutoff ? sameMonth : dateInMonth(cutoff.getFullYear(), cutoff.getMonth() + 1, paymentDay)
}

// Capital de las cuotas de una compra cuya fecha de pago está en (from, to]:
// el banco lo da por pagado y libera ese cupo
function capitalDueBetween(account: Account, tx: Transaction, from: Date | null, to: Date): number {
  const first = firstCutoffFor(parseISODate(tx.date), account.cutoffDate!)
  return installmentSchedule(tx.amount, tx.installments || 1, tx.interestRate || 0)
    .reduce((sum, row) => {
      const due = dueDateFor(dateInMonth(first.getFullYear(), first.getMonth() + row.number - 1, account.cutoffDate!), account.paymentDate)
      return due <= to && (!from || due > from) ? sum + row.capital : sum
    }, 0)
}

/**
 * Capital pendiente de los créditos aparte del cupo (deuda diferida con
 * `outsideLimit`): su valor menos las cuotas cuya fecha de pago ya pasó.
 */
export function outsideLimitDebt(account: Account, today: Date = new Date()): number {
  if (account.type !== 'credit' || !account.cutoffDate) return 0

  return creditTransactions(account, [])
    .filter(t => account.deferredDebts?.find(d => d.id === t.id)?.outsideLimit)
    .reduce((sum, t) => sum + Math.max(0, t.amount - capitalDueBetween(account, t, null, today)), 0)
}

/**
 * Cupo gastado a partir del que mostró el banco (`limitUsedAnchor`): suben
 * las compras posteriores y baja el capital de las cuotas que vencen desde
 * entonces. Intereses, comisiones y créditos aparte del cupo no cuentan.
 */
export function limitUsedFromAnchor(account: Account, transactions: Transaction[], today: Date = new Date()): number | null {
  const anchor = account.limitUsedAnchor
  if (account.type !== 'credit' || !account.cutoffDate || !anchor) return null

  const anchorDate = parseISODate(anchor.date)
  const separate = new Set((account.deferredDebts || []).filter(d => d.outsideLimit).map(d => d.id))
  const todayISO = toISODate(today)

  const used = creditTransactions(account, transactions)
    .filter(t => t.type === 'expense' && !separate.has(t.id) && !t.tags.includes('comisión') && t.date <= todayISO)
    .reduce((sum, t) =>
      sum + (t.date > anchor.date ? t.amount : 0) - capitalDueBetween(account, t, anchorDate, today), anchor.amount)

  return Math.max(0, Math.round(used))
}

function paidUntil(accountTxs: Transaction[], dateISO: string): number {
  return accountTxs
    .filter(tx => tx.type === 'income' && tx.date <= dateISO)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/**
 * Ajuste a lo facturado hasta el corte `untilCutoff` (inclusive), según los
 * pagos mínimos reales de los extractos (`account.statementMinimums`, por
 * fecha de corte). En cada extracto: ajuste = mínimo del extracto − lo que la
 * app calcula, así el pago mínimo queda igual al del banco.
 *
 * Solo cambia CUÁNDO se factura (cuotas, compras del día del corte, fechas
 * de corte distintas), nunca cuánto se debe: los intereses y comisiones del
 * banco se registran como movimientos y la deuda se cuadra con la deuda
 * diferida ("Deuda total según el banco").
 */
export function statementAdjustmentsUntil(
  account: Account,
  transactions: Transaction[],
  untilCutoff?: Date
): number {
  const minimums = account.statementMinimums
  if (account.type !== 'credit' || !account.cutoffDate || !minimums) return 0

  const accountTxs = creditTransactions(account, transactions)
  const limit = untilCutoff ? toISODate(untilCutoff) : '9999-12-31'
  let adjustment = 0

  Object.keys(minimums)
    .filter(cutoffISO => cutoffISO <= limit)
    .sort()
    .forEach(cutoffISO => {
      const cutoffIdx = monthIndexOf(parseISODate(cutoffISO))
      const computed =
        billedUntil(accountTxs, account.cutoffDate!, cutoffIdx) +
        adjustment -
        paidUntil(accountTxs, cutoffISO)

      adjustment += minimums[cutoffISO] - Math.max(0, computed)
    })

  return adjustment
}

/**
 * Calcula el estado de cuenta de una tarjeta de crédito.
 *
 * Lo facturado acumulado hasta el último corte (compras por cuotas, ajustado
 * con los mínimos reales de los extractos) menos todos los pagos hechos a
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
    isMinimumCovered: true
  }

  if (account.type !== 'credit' || !account.cutoffDate) return empty

  const cutoffDay = account.cutoffDate
  const lastCutoff = lastCutoffBefore(today, cutoffDay)
  const nextCutoff = dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, cutoffDay)

  const accountTxs = creditTransactions(account, transactions)

  const totalBilled =
    billedUntil(accountTxs, cutoffDay, monthIndexOf(lastCutoff)) +
    statementAdjustmentsUntil(account, transactions, lastCutoff)
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
    statementAdjustmentsUntil(account, transactions, nextCutoff)
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
    isMinimumCovered: minimumPayment === 0
  }
}
