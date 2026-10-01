import type { Account, Transaction } from '@/interfaces'
import { dateInMonth, daysBetween, monthIndexOf, parseISODate } from './dates'

export interface CreditStatement {
  lastCutoff: Date | null
  nextCutoff: Date | null
  dueDate: Date | null
  daysToDue: number | null
  minimumPayment: number
  totalBilled: number
  totalPaid: number
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

/**
 * Calcula el estado de cuenta de una tarjeta de crédito.
 *
 * Cada compra se factura por cuotas: la cuota k se cobra en el k-ésimo corte
 * desde la fecha de compra. Lo facturado acumulado hasta el último corte menos
 * todos los pagos hechos a la tarjeta es el pago mínimo pendiente. Las compras
 * posteriores al corte no entran hasta el siguiente corte.
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
    isMinimumCovered: true
  }

  if (account.type !== 'credit' || !account.cutoffDate) return empty

  const cutoffDay = account.cutoffDate
  const lastCutoff = lastCutoffBefore(today, cutoffDay)
  const nextCutoff = dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, cutoffDay)
  const lastCutoffIdx = monthIndexOf(lastCutoff)

  const accountTxs = transactions.filter(t => t.accountId === account.id)

  let totalBilled = 0
  let totalPaid = 0

  accountTxs.forEach(tx => {
    if (tx.type === 'income') {
      totalPaid += tx.amount
      return
    }

    if (tx.type !== 'expense') return

    const purchase = parseISODate(tx.date)
    const firstCutoff = firstCutoffFor(purchase, cutoffDay)
    const billedCount = lastCutoffIdx - monthIndexOf(firstCutoff) + 1

    if (billedCount <= 0) return

    const installments = Math.max(1, tx.installments || 1)
    const installmentAmount = tx.installmentAmount || tx.amount / installments

    totalBilled += installmentAmount * Math.min(installments, billedCount)
  })

  // Fecha límite: el primer día de pago después del corte
  let dueDate: Date | null = null
  if (account.paymentDate) {
    const sameMonth = dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth(), account.paymentDate)
    dueDate = sameMonth > lastCutoff
      ? sameMonth
      : dateInMonth(lastCutoff.getFullYear(), lastCutoff.getMonth() + 1, account.paymentDate)
  }

  const minimumPayment = Math.max(0, Math.round(totalBilled - totalPaid))

  return {
    lastCutoff,
    nextCutoff,
    dueDate,
    daysToDue: dueDate ? daysBetween(today, dueDate) : null,
    minimumPayment,
    totalBilled: Math.round(totalBilled),
    totalPaid,
    isMinimumCovered: minimumPayment === 0
  }
}
