import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import type { Account } from '@/interfaces'
import type { CardView } from './cards'
import { money, shortDate } from './format'
import { bankOf } from './banks'

export const kindLabel: Record<Account['type'], string> = {
  credit: 'Crédito',
  savings: 'Ahorros',
  debit: 'Débito',
  cash: 'Efectivo'
}

// Cómo se ve cada cuenta como tarjeta del design system (Inicio y Cuentas)
export function useAccountCards() {
  const store = useFinanceStore()

  function toCard(account: Account): CardView {
    const bal = store.calculateAccountBalance(account.id)
    const number = account.lastDigits ? `•••• ${account.lastDigits}` : ''

    if (account.type !== 'credit') {
      const moves = store.monthTransactions.filter(t => t.accountId === account.id).length
      return {
        id: account.id,
        bank: bankOf(account),
        name: account.name,
        kind: kindLabel[account.type],
        number,
        labelA: 'Saldo',
        valueA: money(bal.balance),
        labelB: 'Movimientos del mes',
        valueB: String(moves),
        rows: [
          { label: 'Saldo', value: money(bal.balance) },
          { label: 'Tipo', value: kindLabel[account.type] },
          { label: 'Movimientos del mes', value: String(moves) }
        ]
      }
    }

    // Como en la v1: el mínimo del extracto con su fecha límite ("Al día" si ya se pagó)
    // y aparte lo que se va acumulando para el próximo corte
    const st = store.getCreditStatement(account.id)
    const due = st?.dueDate ? shortDate(st.dueDate) : '—'
    const covered = !!st?.isMinimumCovered
    const minimumValue = covered ? 'Al día' : money(st?.minimumPayment ?? 0)

    // Chip de arriba: cuándo vence el mínimo (o si ya está al día)
    let kind = 'Crédito'
    let tone: CardView['tone'] = undefined
    if (!account.cutoffDate) {
      kind = 'Sin día de corte'
      tone = 'warning'
    } else if (covered) {
      kind = 'Al día'
      tone = 'success'
    } else if (st?.daysToDue !== null && st?.daysToDue !== undefined && st.minimumPayment > 0) {
      if (st.daysToDue < 0) {
        kind = 'Vencido'
        tone = 'danger'
      } else if (st.daysToDue === 0) {
        kind = 'Vence hoy'
        tone = 'danger'
      } else {
        kind = `Vence ${due}`
        tone = st.daysToDue <= 3 ? 'warning' : undefined
      }
    }

    // Cupo: lo gastado del cupo (sin créditos aparte como el Crédito Grande de ADDI)
    const limitTotal = account.creditLimit || 0
    const limitUsed = bal.limitUsed ?? bal.usedCredit
    const limit = limitTotal
      ? {
          available: money(bal.availableCredit),
          used: money(limitUsed),
          total: money(limitTotal),
          pct: Math.round((limitUsed / limitTotal) * 100)
        }
      : undefined

    const separateName = account.deferredDebts?.find(d => d.outsideLimit)?.description || 'Crédito aparte'
    const rows = [
      { label: 'Pago mínimo', value: minimumValue },
      { label: 'Fecha límite', value: due }
    ]
    if (st?.nextCutoff) rows.push({ label: `Mínimo al corte del ${shortDate(st.nextCutoff)}`, value: money(st.nextMinimumPayment) })
    if (limit) {
      rows.push({ label: 'Cupo disponible', value: limit.available })
      rows.push({ label: 'Cupo usado', value: `${limit.used} (${limit.pct} %)` })
      rows.push({ label: 'Cupo total', value: limit.total })
    }
    rows.push({ label: 'Deuda total', value: money(bal.usedCredit) })
    if (bal.separateDebt) rows.push({ label: `${separateName} (aparte del cupo)`, value: money(bal.separateDebt) })
    if (st?.lastCutoff) rows.push({ label: 'Último corte', value: shortDate(st.lastCutoff) })
    if (st?.nextCutoff) rows.push({ label: 'Próximo corte', value: shortDate(st.nextCutoff) })
    if (account.interestRate) rows.push({ label: 'Interés a cuotas', value: `${account.interestRate} % mes` })

    return {
      id: account.id,
      bank: bankOf(account),
      name: account.name,
      kind,
      tone,
      number,
      labelA: 'Pago mínimo',
      valueA: minimumValue,
      labelB: 'Fecha límite',
      valueB: due,
      limit,
      rows
    }
  }

  // Primero las tarjetas de crédito (lo que hay que pagar), luego las cuentas
  const cards = computed<CardView[]>(() =>
    [...store.accounts]
      .sort((a, b) => Number(b.type === 'credit') - Number(a.type === 'credit'))
      .map(toCard)
  )

  return { toCard, cards }
}
