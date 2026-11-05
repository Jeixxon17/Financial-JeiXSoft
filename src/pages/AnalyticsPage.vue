<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Estadísticas</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Cómo va tu plata este mes y los últimos meses.</p>
      </div>
      <TpMonthPicker />
    </div>

    <!-- ===== Indicadores ===== -->
    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      <div class="col-span-2 flex items-center gap-4 rounded-card border border-line bg-surface-100 p-4 lg:col-span-1">
        <div class="relative size-16 shrink-0">
          <svg viewBox="0 0 56 56" class="size-16 -rotate-90" aria-hidden="true">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-surface-300)" stroke-width="6" />
            <circle
              cx="28" cy="28" r="24" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="150.8"
              :stroke="health.color"
              :stroke-dashoffset="150.8 - (150.8 * store.financialHealth) / 100"
            />
          </svg>
          <span class="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">{{ store.financialHealth }}%</span>
        </div>
        <span class="flex flex-col gap-0.5">
          <span class="text-xs text-ink-faint">Salud financiera</span>
          <strong class="text-sm font-semibold">{{ health.text }}</strong>
        </span>
      </div>
      <div v-for="ind in indicators" :key="ind.label" class="flex flex-col gap-1.5 rounded-card border border-line bg-surface-100 p-4">
        <span class="text-xs text-ink-faint">{{ ind.label }}</span>
        <strong class="text-[22px]/7 font-semibold tabular-nums" :class="ind.class">{{ ind.value.toFixed(0) }} %</strong>
        <span class="h-1.5 overflow-hidden rounded-full bg-surface-300">
          <span class="block h-full rounded-full" :class="ind.bar" :style="{ width: `${Math.min(ind.value, 100)}%` }" />
        </span>
        <span class="text-[11px]/[14px] text-ink-faint">{{ ind.hint }}</span>
      </div>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <!-- ===== Ingresos y gastos por mes ===== -->
      <section class="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface-100 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 :class="sectionTitle">Ingresos y gastos</h2>
          <div class="flex gap-4 text-xs text-ink-muted" aria-hidden="true">
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-chart-income" />Ingresos</span>
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-chart-expense" />Gastos</span>
          </div>
        </div>

        <p v-if="!trend.length" class="m-0 text-sm text-ink-faint">Aún no hay meses con movimientos.</p>
        <div v-else class="flex h-52 items-end gap-2 border-b border-line" role="img" :aria-label="chartLabel">
          <div v-for="m in trend" :key="m.month" class="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <!-- Tooltip del mes -->
            <div
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-tile border border-line bg-surface-200 px-3 py-2 text-xs shadow-float group-hover:block group-focus-within:block"
            >
              <strong class="mb-1 block text-ink">{{ m.label }}</strong>
              <span class="flex items-center gap-1.5 text-ink-muted"><span class="size-2 rounded-[2px] bg-chart-income" />Ingresos <b class="ml-auto pl-3 font-semibold text-ink tabular-nums">{{ money(m.income) }}</b></span>
              <span class="flex items-center gap-1.5 text-ink-muted"><span class="size-2 rounded-[2px] bg-chart-expense" />Gastos <b class="ml-auto pl-3 font-semibold text-ink tabular-nums">{{ money(m.expenses) }}</b></span>
            </div>
            <button type="button" class="flex h-full cursor-default items-end justify-center gap-0.5 rounded-t-tile px-1 hover:bg-surface-200/50 focus-visible:outline-2 focus-visible:outline-accent-light" :aria-label="`${m.label}: ingresos ${money(m.income)}, gastos ${money(m.expenses)}`">
              <span class="w-full max-w-5 rounded-t-[4px] bg-chart-income" :style="{ height: `${pct(m.income)}%` }" />
              <span class="w-full max-w-5 rounded-t-[4px] bg-chart-expense" :style="{ height: `${pct(m.expenses)}%` }" />
            </button>
          </div>
        </div>
        <div v-if="trend.length" class="-mt-2 flex gap-2" aria-hidden="true">
          <span v-for="m in trend" :key="m.month" class="flex-1 truncate text-center text-[11px] text-ink-faint">{{ m.short }}</span>
        </div>

        <!-- Tabla (también es la vista accesible del gráfico) -->
        <details class="group">
          <summary class="cursor-pointer list-none text-[13px] font-medium text-accent-light">
            <span class="group-open:hidden">Ver en tabla</span><span class="hidden group-open:inline">Ocultar tabla</span>
          </summary>
          <div class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr>
                  <th v-for="h in ['Mes', 'Ingresos', 'Gastos', 'Balance', 'Ahorro']" :key="h" class="border-b border-line px-3 py-2 text-left text-[11px] font-semibold tracking-[0.5px] text-ink-faint uppercase">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in trend" :key="m.month" class="[&:last-child>td]:border-b-0">
                  <td class="border-b border-line px-3 py-2 text-ink-muted">{{ m.label }}</td>
                  <td class="border-b border-line px-3 py-2 tabular-nums">{{ money(m.income) }}</td>
                  <td class="border-b border-line px-3 py-2 tabular-nums">{{ money(m.expenses) }}</td>
                  <td class="border-b border-line px-3 py-2 font-semibold tabular-nums" :class="m.income - m.expenses < 0 ? 'text-danger' : 'text-success'">{{ money(m.income - m.expenses) }}</td>
                  <td class="border-b border-line px-3 py-2 tabular-nums text-ink-muted">{{ m.rate.toFixed(0) }} %</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <!-- ===== Gastos por categoría y proyección ===== -->
      <div class="flex min-w-0 flex-col gap-[18px] lg:gap-6">
        <section class="flex flex-col gap-3 rounded-card border border-line bg-surface-100 p-5">
          <h2 :class="sectionTitle">Gastos de {{ monthName }}</h2>
          <p v-if="!topCategories.length" class="m-0 text-sm text-ink-faint">Sin gastos registrados en este mes.</p>
          <div v-for="item in topCategories" :key="item.catId" class="flex flex-col gap-1.5" :title="`${item.name}: ${money(item.amount)} (${item.percent.toFixed(0)} %)`">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="truncate text-ink-muted">{{ item.name }}</span>
              <span class="shrink-0 font-semibold tabular-nums">{{ money(item.amount) }} <small class="font-normal text-ink-faint">{{ item.percent.toFixed(0) }} %</small></span>
            </div>
            <span class="h-2 overflow-hidden rounded-full bg-surface-300">
              <span class="block h-full rounded-full bg-chart-expense" :style="{ width: `${item.share}%` }" />
            </span>
          </div>
        </section>

        <section class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 p-5">
          <h2 :class="[sectionTitle, 'mb-2']">Proyección del mes</h2>
          <div v-for="row in projection" :key="row.label" class="flex justify-between gap-3 border-b border-line py-2.5 text-sm text-ink-muted last:border-b-0">
            <span>{{ row.label }}</span>
            <strong class="font-semibold tabular-nums" :class="row.class">{{ row.value }}</strong>
          </div>
          <p class="mt-2 mb-0 flex gap-2.5 rounded-tile bg-surface-200/60 px-3 py-2.5 text-[13px]/[19px] text-ink-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0" :class="store.remaining >= 0 ? '[&_svg]:text-success' : '[&_svg]:text-warning'">
            <component :is="store.remaining >= 0 ? CircleCheck : CircleAlert" :stroke-width="1.75" aria-hidden="true" />
            {{ recommendation }}
          </p>
        </section>
      </div>
    </div>
  </TpLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpMonthPicker from '@/components/tp/TpMonthPicker.vue'
import { money } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const sectionTitle = 'm-0 font-sans text-lg/6 font-semibold'

const monthName = computed(() => {
  const [y, m] = store.selectedMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long' })
})

// ---------- Indicadores ----------
const health = computed(() => {
  const h = store.financialHealth
  if (h >= 80) return { text: 'Excelentes hábitos financieros', color: 'var(--color-success)' }
  if (h >= 60) return { text: 'Buen manejo del dinero', color: 'var(--color-success)' }
  if (h >= 40) return { text: 'Hay cosas por mejorar', color: 'var(--color-warning)' }
  return { text: 'Requiere atención', color: 'var(--color-danger)' }
})

// Uso de cupo con lo que de verdad gasta cupo (sin créditos aparte)
const creditUsage = computed(() => {
  const cards = store.accounts.filter(a => a.type === 'credit' && a.creditLimit)
  const limit = cards.reduce((s, a) => s + (a.creditLimit || 0), 0)
  const used = cards.reduce((s, a) => s + store.calculateAccountBalance(a.id).limitUsed, 0)
  return limit > 0 ? (used / limit) * 100 : 0
})

const debtRatio = computed(() => (store.monthIncome > 0 ? (store.totalDebt / store.monthIncome) * 100 : 0))

const tone = (good: boolean, warn: boolean) => (good ? ['text-success', 'bg-success'] : warn ? ['text-warning', 'bg-warning'] : ['text-danger', 'bg-danger'])

const indicators = computed(() => {
  const s = tone(store.savingsRate >= 20, store.savingsRate >= 10)
  const d = tone(debtRatio.value <= 30, debtRatio.value <= 50)
  const c = tone(creditUsage.value <= 30, creditUsage.value <= 70)
  return [
    { label: 'Tasa de ahorro', value: Math.max(0, store.savingsRate), hint: 'Meta recomendada: 20 %', class: s[0], bar: s[1] },
    { label: 'Nivel de deuda', value: debtRatio.value, hint: 'Deuda / ingresos del mes', class: d[0], bar: d[1] },
    { label: 'Uso del cupo', value: creditUsage.value, hint: 'Cupo usado / cupo total', class: c[0], bar: c[1] }
  ]
})

// ---------- Ingresos y gastos por mes ----------
const trend = computed(() =>
  store.monthlyTrend.map(m => {
    const [y, mo] = m.month.split('-').map(Number)
    const d = new Date(y, mo - 1, 1)
    const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    return {
      ...m,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      short: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      rate: m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0
    }
  })
)

const maxValue = computed(() => Math.max(1, ...trend.value.flatMap(m => [m.income, m.expenses])))
const pct = (v: number) => Math.max(v > 0 ? 1.5 : 0, (v / maxValue.value) * 100)
const chartLabel = computed(() => `Ingresos y gastos de los últimos ${trend.value.length} meses. La tabla tiene los valores.`)

// ---------- Gastos por categoría ----------
const topCategories = computed(() => {
  const total = store.monthExpenses
  const list = Object.entries(store.expensesByCategory)
    .map(([catId, amount]) => ({
      catId,
      amount,
      name: store.getCategoryById(catId)?.name || 'Otro',
      percent: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
  const top = list[0]?.amount || 1
  return list.map(c => ({ ...c, share: (c.amount / top) * 100 }))
})

// ---------- Proyección ----------
const today = new Date()
const dayOfMonth = today.getDate()
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
const dailyAvg = computed(() => (dayOfMonth > 0 ? store.monthExpenses / dayOfMonth : 0))
const projectedExpenses = computed(() => dailyAvg.value * daysInMonth)
const projectedBalance = computed(() => store.monthIncome - projectedExpenses.value)

const projection = computed(() => [
  { label: 'Ingresos del mes', value: money(store.monthIncome), class: 'text-success' },
  { label: 'Gastos del mes', value: money(store.monthExpenses), class: '' },
  { label: 'Balance', value: money(store.remaining), class: store.remaining >= 0 ? 'text-success' : 'text-danger' },
  { label: 'Gasto promedio por día', value: money(dailyAvg.value), class: '' },
  { label: 'Gastos al final del mes', value: money(projectedExpenses.value), class: 'text-warning' },
  { label: 'Balance proyectado', value: money(projectedBalance.value), class: projectedBalance.value >= 0 ? 'text-success' : 'text-danger' }
])

const recommendation = computed(() => {
  if (store.remaining >= 0 && store.savingsRate >= 20) return 'Vas muy bien: estás ahorrando más del 20 % de lo que te entra.'
  if (store.remaining >= 0 && store.savingsRate >= 10) return 'Bien encaminado. Intenta llevar tu ahorro al 20 %.'
  if (store.remaining >= 0) return 'Estás en positivo pero con poco margen. Revisa los gastos que puedes bajar.'
  return `Los gastos superan los ingresos por ${money(Math.abs(store.remaining))}. Recorta gastos que no sean necesarios.`
})
</script>
