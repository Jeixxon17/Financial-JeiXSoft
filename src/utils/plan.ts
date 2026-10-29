// Plan de ahorro y gasto: cuánto ahorrar para cada meta, cuánto queda para
// gastar en el mes y los consejos del asesor. Todo se calcula en el
// dispositivo con los datos de la app.

import type { Account, Budget, Category, SavingsGoal, Transaction } from '@/interfaces'

// ------------------------------------------------------- Fondo de emergencia

export interface EmergencyInfo {
  // No se ahorra mientras haya deudas grandes o las quincenas estén en rojo
  locked: boolean
  reason: string
  // Meses de sueldo neto que cubre el fondo
  months: number
  target: number
  // Ahorro al mes cuando se desbloquea: el 10 % del sueldo neto
  monthly: number
  // Deuda que falta pagar para poder empezar
  debtToUnlock: number
  // Hasta cuánta deuda se permite (un sueldo neto: el uso normal de las tarjetas)
  debtLimit: number
}

export function emergencyInfo(opts: {
  netIncome: number
  obligations: number
  creditDebt: number
  months?: number
}): EmergencyInfo {
  const months = opts.months || 3
  const debtLimit = Math.round(opts.netIncome)
  const debtToUnlock = Math.max(0, Math.round(opts.creditDebt - debtLimit))
  const deficit = opts.obligations - opts.netIncome
  const locked = debtToUnlock > 0 || deficit > 0

  let reason = ''
  if (debtToUnlock > 0 && deficit > 0) {
    reason = `Aún hay deudas pendientes: debes ${money(opts.creditDebt)} y las quincenas no alcanzan (faltan ${money(deficit)} al mes).`
  } else if (debtToUnlock > 0) {
    reason = `Aún hay deudas pendientes: debes ${money(opts.creditDebt)}; paga ${money(debtToUnlock)} más para empezar.`
  } else if (deficit > 0) {
    reason = `Las quincenas no alcanzan para tus obligaciones (faltan ${money(deficit)} al mes).`
  }

  return {
    locked,
    reason,
    months,
    target: Math.round((opts.netIncome * months) / 10000) * 10000,
    monthly: Math.ceil((opts.netIncome * 0.1) / 1000) * 1000,
    debtToUnlock,
    debtLimit
  }
}

// ------------------------------------------------------------------ Metas

/** Lo ahorrado en la meta (suma de abonos). */
export function goalSaved(goal: SavingsGoal): number {
  return goal.contributions.reduce((sum, c) => sum + c.amount, 0)
}

const monthNumber = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1

/** Meses en que se puede abonar: del mes de `fromISO` al mes anterior a la fecha meta. */
function monthsUntil(fromISO: string, targetISO: string): number {
  return Math.max(0, monthNumber(targetISO) - monthNumber(fromISO))
}

export interface GoalStatus {
  saved: number
  remaining: number
  percent: number
  // Cuánto abonar cada mes / quincena desde ahora para llegar a tiempo
  monthly: number
  perQuincena: number
  monthsLeft: number
  // Lo que debería llevar hoy si se hubiera abonado parejo desde el inicio
  expectedNow: number
  started: boolean
  done: boolean
  late: boolean
}

export function goalStatus(goal: SavingsGoal, todayISO: string, emergency?: EmergencyInfo): GoalStatus {
  const saved = goalSaved(goal)

  // Fondo de emergencia: sin fecha; ahorra el 10 % del sueldo cuando se desbloquea
  if (goal.kind === 'emergency' && emergency) {
    const target = emergency.target
    const remaining = Math.max(0, target - saved)
    const monthly = emergency.locked ? 0 : Math.min(remaining, emergency.monthly)
    return {
      saved,
      remaining,
      percent: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
      monthly,
      perQuincena: Math.ceil(monthly / 2 / 1000) * 1000,
      monthsLeft: emergency.monthly > 0 ? Math.ceil(remaining / emergency.monthly) : 0,
      expectedNow: 0,
      started: !emergency.locked,
      done: remaining === 0,
      late: false
    }
  }

  const remaining = Math.max(0, goal.targetAmount - saved)
  const started = todayISO >= goal.startDate
  const from = started ? todayISO : goal.startDate
  const monthsLeft = monthsUntil(from, goal.targetDate)
  const monthly = remaining > 0 ? (monthsLeft > 0 ? remaining / monthsLeft : remaining) : 0

  const totalMonths = monthsUntil(goal.startDate, goal.targetDate) || 1
  const elapsed = started ? Math.min(totalMonths, monthNumber(todayISO) - monthNumber(goal.startDate)) : 0
  const expectedNow = (goal.targetAmount * elapsed) / totalMonths

  return {
    saved,
    remaining,
    percent: goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0,
    monthly: Math.ceil(monthly / 1000) * 1000,
    perQuincena: Math.ceil(monthly / 2 / 1000) * 1000,
    monthsLeft,
    expectedNow,
    started,
    done: remaining === 0,
    late: started && saved + 1 < expectedNow
  }
}

/** Ahorro que pide la meta en el mes `monthKey` (YYYY-MM): 0 fuera de su periodo. */
export function goalMonthlyFor(goal: SavingsGoal, monthKey: string, todayISO: string, emergency?: EmergencyInfo): number {
  if (!goal.active) return 0
  if (goal.kind === 'emergency') {
    return emergency && monthKey >= todayISO.slice(0, 7) ? goalStatus(goal, todayISO, emergency).monthly : 0
  }
  const month = monthNumber(`${monthKey}-01`)
  if (month < monthNumber(goal.startDate) || month >= monthNumber(goal.targetDate)) return 0
  return goalStatus(goal, todayISO).monthly
}

// ------------------------------------------------------------ Plan del mes

export interface MonthPlan {
  income: number
  obligations: number
  savings: number
  // Lo que queda para comida, transporte, salidas...
  free: number
  // Gastado en el mes con cuentas de débito y efectivo (sin pagos de quincena)
  spentCash: number
  // Compras con tarjeta o ADDI en el mes: se vuelven deuda
  spentCredit: number
  leftToSpend: number
}

export function isObligationCategory(categoryId: string): boolean {
  return categoryId.startsWith('debt-') || categoryId === 'transfer' || categoryId === 'deferred'
}

export function monthPlan(opts: {
  monthKey: string
  netIncome: number
  obligations: number
  goals: SavingsGoal[]
  accounts: Account[]
  transactions: Transaction[]
  todayISO: string
  emergency?: EmergencyInfo
}): MonthPlan {
  const savings = opts.goals.reduce(
    (sum, g) => sum + goalMonthlyFor(g, opts.monthKey, opts.todayISO, opts.emergency), 0)
  const free = opts.netIncome - opts.obligations - savings
  const credit = new Set(opts.accounts.filter(a => a.type === 'credit').map(a => a.id))

  let spentCash = 0
  let spentCredit = 0
  for (const t of opts.transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(opts.monthKey) || isObligationCategory(t.category)) continue
    if (t.tags?.includes('comisión')) continue
    if (credit.has(t.accountId)) spentCredit += t.amount
    else spentCash += t.amount
  }

  return {
    income: opts.netIncome,
    obligations: opts.obligations,
    savings,
    free,
    spentCash,
    spentCredit,
    leftToSpend: free - spentCash
  }
}

// --------------------------------------------------------------- Presupuestos

/** Presupuesto de la categoría en el mes: el del mes si existe, si no el de todos los meses. */
export function budgetFor(budgets: Budget[], categoryId: string, monthKey: string): Budget | undefined {
  return budgets.find(b => b.categoryId === categoryId && b.month === monthKey) ||
    budgets.find(b => b.categoryId === categoryId && !b.month)
}

/** Promedio de gasto por categoría en los 3 meses completos antes de `monthKey`. */
export function averageSpending(transactions: Transaction[], monthKey: string): Record<string, number> {
  const current = monthNumber(`${monthKey}-01`)
  const totals: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type !== 'expense' || isObligationCategory(t.category) || t.tags?.includes('comisión')) continue
    const m = monthNumber(t.date)
    if (m >= current || m < current - 3) continue
    totals[t.category] = (totals[t.category] || 0) + t.amount
  }
  return Object.fromEntries(Object.entries(totals).map(([id, total]) => [id, total / 3]))
}

/**
 * Presupuesto sugerido por categoría: el promedio de los últimos 3 meses,
 * recortado parejo si no cabe en lo que queda libre del mes.
 */
export function suggestBudgets(average: Record<string, number>, free: number): Record<string, number> {
  const total = Object.values(average).reduce((s, v) => s + v, 0)
  // Sin margen se propone gastar a lo sumo la mitad de lo de siempre
  const factor = total <= 0 ? 0 : free <= 0 ? 0.5 : Math.min(1, free / total)
  return Object.fromEntries(
    Object.entries(average)
      .map(([id, avg]) => [id, Math.round((avg * factor) / 10000) * 10000] as [string, number])
      .filter(([, amount]) => amount > 0)
  )
}

// ------------------------------------------------------------------ Asesor

export interface Advice {
  level: 'danger' | 'warn' | 'good' | 'info'
  icon: string
  title: string
  text: string
}

export interface AdvisorInput {
  plan: MonthPlan
  goals: SavingsGoal[]
  accounts: Account[]
  creditDebt: { account: Account; debt: number; minimum: number }[]
  budgets: { category?: Category; amount: number; spent: number }[]
  average: Record<string, number>
  spentByCategory: Record<string, number>
  categories: Category[]
  todayISO: string
  // Fracción del mes que ya pasó (0..1)
  monthProgress: number
  emergency: EmergencyInfo
}

const money = (n: number) => `$ ${Math.round(Math.abs(n)).toLocaleString('es-CO')}`

export function advise(input: AdvisorInput): Advice[] {
  const { plan } = input
  const tips: Advice[] = []

  // 1. ¿Alcanza el sueldo?
  if (plan.income > 0 && plan.income - plan.obligations < 0) {
    tips.push({
      level: 'danger', icon: '🚨', title: 'Las obligaciones superan tu sueldo',
      text: `Cada mes te faltan ${money(plan.income - plan.obligations)} solo para cubrir lo de las quincenas. ` +
        'Antes de ahorrar, evita compras nuevas con tarjeta y prioriza terminar las deudas más pequeñas para liberar esas cuotas.'
    })
  } else if (plan.free < 0) {
    tips.push({
      level: 'warn', icon: '⚠️', title: 'El ahorro de tus metas no cabe este mes',
      text: `Después de obligaciones y ahorro te faltan ${money(plan.free)}. Puedes alargar la fecha de alguna meta o recortar gastos.`
    })
  } else if (plan.income > 0) {
    tips.push({
      level: 'good', icon: '✅', title: `Te quedan ${money(plan.free)} para gastos del mes`,
      text: `Es lo que queda para comida, transporte y salidas después de obligaciones y ahorro (unos ${money(plan.free / 30)} al día).`
    })
  }

  // 2. Ritmo de gasto del mes
  if (plan.free > 0 && plan.spentCash > plan.free * Math.max(0.15, input.monthProgress) * 1.1) {
    tips.push({
      level: 'warn', icon: '🏃', title: 'Vas gastando más rápido que el mes',
      text: `Llevas ${money(plan.spentCash)} (${Math.round((plan.spentCash / plan.free) * 100)} % de lo libre) con el ` +
        `${Math.round(input.monthProgress * 100)} % del mes. Te quedan ${money(Math.max(0, plan.leftToSpend))}.`
    })
  }

  // 3. Compras con crédito
  const totalDebt = input.creditDebt.reduce((s, c) => s + c.debt, 0)
  if (plan.spentCredit > 0) {
    tips.push({
      level: totalDebt > plan.income ? 'warn' : 'info', icon: '💳', title: `Compraste ${money(plan.spentCredit)} con crédito este mes`,
      text: 'Eso se vuelve deuda: entra en el pago de la tarjeta de los próximos meses y, si es a cuotas, con intereses.'
    })
  }

  // 4. Deuda e intereses
  if (totalDebt > 0) {
    const interest = input.creditDebt.reduce((s, c) => s + c.debt * ((c.account.interestRate || 0) / 100), 0)
    const smallest = [...input.creditDebt].filter(c => c.debt > 0).sort((a, b) => a.debt - b.debt)[0]
    tips.push({
      level: totalDebt > plan.income * 2 ? 'danger' : 'warn', icon: '📉',
      title: `Debes ${money(totalDebt)} en tarjetas y créditos`,
      text: (interest > 0 ? `Pagar el mínimo cuesta cerca de ${money(interest)} al mes en intereses. ` : '') +
        (smallest ? `La más pequeña es ${smallest.account.name} (${money(smallest.debt)}): si la terminas primero liberas su cuota para la siguiente.` : '')
    })
  }

  // 5. Metas
  const active = input.goals.filter(g => g.active)
  for (const goal of active) {
    if (goal.kind === 'emergency') continue
    const st = goalStatus(goal, input.todayISO)
    if (st.done) {
      tips.push({ level: 'good', icon: '🏆', title: `¡Meta "${goal.name}" completa!`, text: `Ya tienes ${money(st.saved)}.` })
    } else if (st.late) {
      tips.push({
        level: 'warn', icon: goal.icon, title: `"${goal.name}" va atrasada`,
        text: `Deberías llevar ${money(st.expectedNow)} y llevas ${money(st.saved)}. Ahora toca abonar ${money(st.monthly)} al mes (${money(st.perQuincena)} por quincena).`
      })
    } else if (!st.started) {
      tips.push({
        level: 'info', icon: goal.icon, title: `"${goal.name}" empieza el ${goal.startDate.split('-').reverse().join('/')}`,
        text: `Desde ahí son ${money(st.monthly)} al mes (${money(st.perQuincena)} por quincena) durante ${st.monthsLeft} meses.`
      })
    }
  }

  // 6. Fondo de emergencia
  const em = input.emergency
  const fund = active.find(g => g.kind === 'emergency')
  if (em.locked) {
    tips.push({
      level: 'info', icon: '🔒', title: 'Aún no se puede sacar fondo de emergencia',
      text: `${em.reason} Primero las deudas: cuando bajen de ${money(em.debtLimit)} y las quincenas alcancen, ` +
        `el fondo arranca con ${money(em.monthly / 2)} por quincena hasta reunir ${money(em.target)} (${em.months} meses de sueldo).`
    })
  } else if (!fund) {
    tips.push({
      level: 'good', icon: '🛟', title: 'Ya puedes empezar tu fondo de emergencia',
      text: `Créalo en Metas: ${money(em.monthly / 2)} por quincena hasta reunir ${money(em.target)} (${em.months} meses de sueldo).`
    })
  } else {
    const st = goalStatus(fund, input.todayISO, em)
    if (!st.done) {
      tips.push({
        level: 'info', icon: '🛟', title: `Fondo de emergencia: ${money(st.saved)} de ${money(em.target)}`,
        text: `Abona ${money(st.perQuincena)} por quincena; en unos ${st.monthsLeft} meses lo tienes completo.`
      })
    }
  }

  // 7. Presupuestos pasados o casi
  for (const b of input.budgets) {
    if (!b.category || b.amount <= 0) continue
    if (b.spent > b.amount) {
      tips.push({
        level: 'warn', icon: b.category.icon, title: `Te pasaste en ${b.category.name}`,
        text: `Gastaste ${money(b.spent)} de ${money(b.amount)} (${money(b.spent - b.amount)} de más).`
      })
    } else if (b.spent > b.amount * 0.85) {
      tips.push({
        level: 'info', icon: b.category.icon, title: `${b.category.name} casi al límite`,
        text: `Te quedan ${money(b.amount - b.spent)} de ${money(b.amount)}.`
      })
    }
  }

  // 8. Categorías que se dispararon frente al promedio
  for (const [id, spent] of Object.entries(input.spentByCategory)) {
    const avg = input.average[id] || 0
    const cat = input.categories.find(c => c.id === id)
    if (!cat || isObligationCategory(id) || avg < 50000 || spent < avg * 1.4) continue
    if (input.budgets.some(b => b.category?.id === id)) continue
    tips.push({
      level: 'info', icon: cat.icon, title: `${cat.name} va por encima de lo normal`,
      text: `Llevas ${money(spent)} este mes y tu promedio es ${money(avg)}. Ponle un presupuesto para controlarlo.`
    })
  }

  // 9. Categorías donde vas gastando menos que siempre (con el mes avanzado)
  if (input.monthProgress >= 0.5) {
    for (const [id, avg] of Object.entries(input.average)) {
      const cat = input.categories.find(c => c.id === id)
      const spent = input.spentByCategory[id] || 0
      if (!cat || isObligationCategory(id) || avg < 100000) continue
      if (spent < avg * input.monthProgress * 0.6) {
        tips.push({
          level: 'good', icon: cat.icon, title: `Bien en ${cat.name}: vas por debajo de lo normal`,
          text: `Llevas ${money(spent)} y sueles gastar ${money(avg)} al mes. Lo que no gastes ahí puede ir a tus deudas o al ahorro.`
        })
      }
    }
  }

  // 10. Tasa de ahorro
  if (plan.income > 0 && plan.free >= 0) {
    const rate = (plan.savings / plan.income) * 100
    if (rate < 10) {
      tips.push({
        level: 'info', icon: '🐷', title: `Ahorras el ${rate.toFixed(0)} % de tu sueldo`,
        text: `Una meta sana es al menos el 10 % (${money(plan.income * 0.1)} al mes). Cada deuda que termines es plata que puedes pasar al ahorro.`
      })
    }
  }

  const order = { danger: 0, warn: 1, info: 2, good: 3 }
  return tips.sort((a, b) => order[a.level] - order[b.level])
}

// ------------------------------------------- Al registrar un gasto (asesor)

export interface SpendingFeedbackInput {
  tx: Pick<Transaction, 'type' | 'amount' | 'category' | 'accountId' | 'date'>
  plan: MonthPlan
  budget?: Budget
  // Gastado en la categoría en el mes, ya con este gasto
  categorySpent: number
  categoryAverage: number
  category?: Category
  isCredit: boolean
  monthProgress: number
}

/**
 * Alertas del asesor justo después de registrar un gasto, la más importante
 * primero. Vacío si no es un gasto.
 */
export function spendingFeedback(input: SpendingFeedbackInput): Advice[] {
  const { tx, plan, category } = input
  if (tx.type !== 'expense' || isObligationCategory(tx.category)) return []
  const tips: Advice[] = []
  const name = category?.name || 'esta categoría'

  // Presupuesto de la categoría
  if (input.budget && input.budget.amount > 0) {
    const { amount } = input.budget
    const spent = input.categorySpent
    if (spent > amount) {
      tips.push({
        level: 'danger', icon: '🚨', title: `Te pasaste del presupuesto de ${name}`,
        text: `Llevas ${money(spent)} de ${money(amount)} (${money(spent - amount)} de más). No gastes más en ${name} este mes.`
      })
    } else if (spent > amount * 0.8) {
      tips.push({
        level: 'warn', icon: '⚠️', title: `${name}: casi al límite`,
        text: `Te quedan ${money(amount - spent)} de ${money(amount)} para el resto del mes. Cuídalos.`
      })
    }
  } else if (input.categoryAverage >= 50000 && input.categorySpent > input.categoryAverage * 1.2) {
    tips.push({
      level: 'warn', icon: category?.icon || '📊', title: `${name} ya va por encima de lo normal`,
      text: `Llevas ${money(input.categorySpent)} este mes y sueles gastar ${money(input.categoryAverage)}. Bájale a ${name}.`
    })
  }

  const deficit = plan.income - plan.obligations < 0
  if (input.isCredit) {
    // Con crédito: deuda nueva
    tips.push({
      level: deficit ? 'danger' : 'warn', icon: '💳', title: 'Esta compra es deuda nueva',
      text: deficit
        ? 'Tus quincenas ya no alcanzan para las obligaciones: evita más compras con tarjeta o ADDI hasta salir de las deudas.'
        : `Se suma al pago de la tarjeta de los próximos meses. Este mes llevas ${money(plan.spentCredit)} con crédito.`
    })
  } else if (plan.income > 0) {
    // Con débito o efectivo: lo libre del mes
    if (plan.free <= 0 || plan.leftToSpend < 0) {
      tips.push({
        level: 'danger', icon: '🛑', title: 'Ya no queda dinero libre este mes',
        text: plan.free <= 0
          ? 'Tus obligaciones y ahorro ya usan todo el sueldo: cada gasto extra sale de lo que necesitas para pagar.'
          : `Te pasaste ${money(-plan.leftToSpend)} de lo libre. Para lo que queda del mes, solo lo indispensable.`
      })
    } else if (plan.spentCash > plan.free * Math.max(0.2, input.monthProgress) * 1.1) {
      tips.push({
        level: 'warn', icon: '🏃', title: 'Vas gastando muy rápido',
        text: `Llevas ${Math.round((plan.spentCash / plan.free) * 100)} % de lo libre con el ${Math.round(input.monthProgress * 100)} % del mes. ` +
          `Te quedan ${money(plan.leftToSpend)}.`
      })
    } else {
      tips.push({
        level: 'good', icon: '✅', title: 'Vas bien',
        text: `Te quedan ${money(plan.leftToSpend)} libres para el resto del mes.`
      })
    }
  }

  const order = { danger: 0, warn: 1, info: 2, good: 3 }
  return tips.sort((a, b) => order[a.level] - order[b.level])
}
