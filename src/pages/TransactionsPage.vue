<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_200px]">
        <h1 class="m-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]">Movimientos</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">{{ periodLabel }}</p>
      </div>

      <!-- Celular: filtros y registrar -->
      <button type="button" :class="[iconBtn, 'lg:hidden']" aria-label="Filtros" @click="showFilters = true">
        <SlidersHorizontal :stroke-width="1.75" aria-hidden="true" />
        <span v-if="extraFilters" class="absolute top-1 right-1 size-2.5 rounded-full border-2 border-bg-base bg-primary" />
      </button>
      <button type="button" :class="[iconBtn, 'border-primary bg-primary text-white lg:hidden']" aria-label="Registrar movimiento" @click="openNew">
        <Plus :stroke-width="1.75" aria-hidden="true" />
      </button>

      <!-- Escritorio: buscador y registrar -->
      <label :class="[searchBox, 'hidden lg:flex lg:flex-[0_1_320px]']">
        <Search :stroke-width="1.75" aria-hidden="true" />
        <input v-model="search" type="search" placeholder="Buscar por descripción, categoría o cuenta" :class="searchInput" />
      </label>
      <div class="hidden lg:block">
        <TpButton @click="openNew">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Registrar movimiento
        </TpButton>
      </div>
    </div>

    <!-- Celular: buscador -->
    <label :class="[searchBox, 'lg:hidden']">
      <Search :stroke-width="1.75" aria-hidden="true" />
      <input v-model="search" type="search" placeholder="Buscar movimientos" :class="searchInput" />
    </label>

    <!-- Celular: ingresos y gastos del período -->
    <div class="grid grid-cols-2 gap-2.5 lg:hidden">
      <div v-for="stat in stats" :key="stat.label" :class="statBox">
        <span class="text-xs text-ink-faint">{{ stat.label }}</span>
        <TpSkeleton v-if="!ready" class="my-0.5 block h-5 w-24 rounded-chip" />
        <span v-else class="text-lg/6 font-semibold tabular-nums" :class="stat.class">{{ stat.value }}</span>
      </div>
    </div>

    <!-- Filtros rápidos -->
    <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
      <button
        v-for="p in periods"
        :key="p.value"
        type="button"
        :class="[chip, period === p.value ? chipOn : chipOff]"
        :aria-pressed="period === p.value"
        @click="setPeriod(p.value)"
      >
        {{ p.label }}
      </button>
      <span class="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden="true" />
      <button
        v-for="k in kinds"
        :key="k.value"
        type="button"
        :class="[chip, kind === k.value ? chipOn : chipOff]"
        :aria-pressed="kind === k.value"
        @click="kind = kind === k.value ? '' : k.value"
      >
        {{ k.label }}
      </button>

      <!-- Escritorio: rango, cuenta y categoría en la misma fila -->
      <template v-if="period === 'range'">
        <input v-model="rangeFrom" type="date" :max="rangeTo || today" aria-label="Desde" :class="pillField" />
        <input v-model="rangeTo" type="date" :min="rangeFrom" :max="today" aria-label="Hasta" :class="pillField" />
      </template>
      <span class="hidden flex-1 lg:block" />
      <select v-model="accountId" aria-label="Cuenta" :class="pillField">
        <option value="">Todas las cuentas</option>
        <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
      </select>
      <select v-model="categoryId" aria-label="Categoría" :class="pillField">
        <option value="">Todas las categorías</option>
        <option v-for="cat in sortedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <!-- ===== Lista ===== -->
      <div class="flex min-w-0 flex-col gap-4">
        <!-- Cargando -->
        <template v-if="!ready">
          <div v-for="g in 2" :key="g" class="flex flex-col gap-2.5" aria-busy="true" aria-label="Cargando movimientos">
            <TpSkeleton class="block h-3.5 w-36 rounded-chip" />
            <div v-for="n in 3" :key="n" class="flex items-center gap-3 rounded-tile bg-surface-100 px-4 py-3">
              <TpSkeleton class="block size-10 shrink-0 rounded-full" />
              <span class="flex flex-1 flex-col gap-2">
                <TpSkeleton class="block h-3.5 rounded-chip" :class="n % 2 ? 'w-36' : 'w-28'" />
                <TpSkeleton class="block h-3 w-24 rounded-chip" />
              </span>
              <TpSkeleton class="block h-4 w-20 rounded-chip" />
            </div>
          </div>
        </template>

        <!-- Sin resultados -->
        <div v-else-if="!items.length" class="flex flex-col items-center gap-2 rounded-card bg-surface-100 px-6 py-10 text-center">
          <span class="grid grid-cols-[minmax(0,1fr)] size-12 place-items-center rounded-full bg-surface-200 text-ink-faint [&_svg]:size-6">
            <SearchX :stroke-width="1.75" aria-hidden="true" />
          </span>
          <strong class="text-base font-semibold">{{ hasAnyFilter ? 'Nada con estos filtros' : 'Aún no hay movimientos' }}</strong>
          <span class="text-sm text-ink-muted">
            {{ hasAnyFilter ? 'Prueba con otro período o quita algún filtro.' : 'Registra tu primer gasto o ingreso.' }}
          </span>
          <TpButton v-if="hasAnyFilter" variant="secondary" class="mt-2" @click="clearFilters">Quitar filtros</TpButton>
          <TpButton v-else class="mt-2" @click="openNew">Registrar movimiento</TpButton>
        </div>

        <template v-else>
          <!-- Celular: agrupado por día -->
          <section v-for="group in groups" :key="group.date" class="flex flex-col gap-2 lg:hidden">
            <h2 class="m-0 font-sans text-[13px]/[18px] font-semibold text-ink-muted">{{ group.title }}</h2>
            <button
              v-for="item in group.items"
              :key="item.tx.id"
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-surface-100 px-4 py-3 text-left transition-colors hover:bg-surface-200"
              @click="detail = item.tx"
            >
              <span class="grid grid-cols-[minmax(0,1fr)] size-10 shrink-0 place-items-center rounded-full bg-surface-300">
                <component :is="item.icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate text-[15px]/[22px] font-semibold">{{ item.title }}</span>
                <span class="truncate text-xs text-ink-faint">{{ item.meta }}</span>
              </span>
              <span class="flex flex-col items-end gap-0.5">
                <span class="text-base/[22px] font-semibold whitespace-nowrap tabular-nums" :class="{ 'text-success': item.income }">{{ item.amount }}</span>
                <span v-if="item.note" class="text-xs text-ink-faint">{{ item.note }}</span>
              </span>
            </button>
          </section>

          <!-- Escritorio: tabla con un encabezado por día -->
          <div class="hidden overflow-x-auto rounded-card border border-line bg-surface-100 lg:block">
            <table class="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th v-for="h in ['Descripción', 'Categoría', 'Cuenta']" :key="h" :class="thClass">{{ h }}</th>
                  <th :class="[thClass, 'text-right']">Monto</th>
                </tr>
              </thead>
              <tbody v-for="group in groups" :key="group.date">
                <tr>
                  <td colspan="4" class="border-b border-line bg-surface-200/40 px-4 py-2 text-xs font-semibold text-ink-muted">{{ group.title }}</td>
                </tr>
                <tr
                  v-for="item in group.items"
                  :key="item.tx.id"
                  class="cursor-pointer hover:[&>td]:bg-surface-200"
                  tabindex="0"
                  @click="detail = item.tx"
                  @keydown.enter="detail = item.tx"
                >
                  <td :class="[tdClass, 'font-semibold text-ink']">
                    <span class="mr-2.5 inline-grid size-8 place-items-center rounded-full bg-surface-300 align-middle [&_svg]:size-4">
                      <component :is="item.icon" :stroke-width="1.75" aria-hidden="true" />
                    </span>
                    {{ item.title }}
                    <span v-if="item.note" class="ml-1.5 text-xs font-normal text-ink-faint">{{ item.note }}</span>
                  </td>
                  <td :class="[tdClass, 'text-ink-muted']">{{ item.category }}</td>
                  <td :class="[tdClass, 'text-ink-muted']">{{ item.account }}</td>
                  <td :class="[tdClass, 'text-right font-semibold whitespace-nowrap tabular-nums', item.income ? 'text-success' : 'text-ink']">
                    {{ item.amount }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <TpButton v-if="items.length > limit" variant="secondary" class="self-center" @click="limit += PAGE">
            Ver más ({{ items.length - limit }})
          </TpButton>
        </template>
      </div>

      <!-- ===== Escritorio: resumen y gastos por categoría ===== -->
      <div class="hidden min-w-0 flex-col gap-4 lg:flex">
        <div class="grid grid-cols-2 gap-2.5">
          <div v-for="stat in stats" :key="stat.label" :class="statBox">
            <span class="text-xs text-ink-faint">{{ stat.label }}</span>
            <TpSkeleton v-if="!ready" class="my-0.5 block h-5 w-24 rounded-chip" />
            <strong v-else class="text-lg/6 font-semibold tabular-nums" :class="stat.class">{{ stat.value }}</strong>
          </div>
        </div>

        <div class="flex flex-col gap-3 rounded-card border border-line bg-surface-100 p-5">
          <span class="text-sm font-medium text-ink-muted">Gastos por categoría</span>
          <template v-if="!ready">
            <TpSkeleton class="block h-2.5 rounded-full" />
            <div v-for="n in 4" :key="n" class="flex justify-between">
              <TpSkeleton class="block h-3.5 w-28 rounded-chip" />
              <TpSkeleton class="block h-3.5 w-20 rounded-chip" />
            </div>
          </template>
          <p v-else-if="!byCategory.length" class="m-0 text-sm text-ink-faint">Sin gastos en este período.</p>
          <template v-else>
            <div class="flex h-2.5 overflow-hidden rounded-full bg-surface-300">
              <span v-for="c in byCategory" :key="c.name" class="h-full" :style="{ width: `${c.pct}%`, background: c.color }" />
            </div>
            <button
              v-for="c in byCategory"
              :key="c.name"
              type="button"
              class="flex cursor-pointer items-center gap-2.5 text-left text-sm text-ink-muted hover:text-ink disabled:cursor-default disabled:hover:text-ink-muted"
              :disabled="!c.id"
              @click="c.id && (categoryId = c.id)"
            >
              <span class="size-2.5 shrink-0 rounded-full" :style="{ background: c.color }" />
              <span class="min-w-0 flex-1 truncate">{{ c.name }}</span>
              <span class="text-xs text-ink-faint tabular-nums">{{ c.pct }} %</span>
              <strong class="font-semibold text-ink tabular-nums">{{ money(c.amount) }}</strong>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Celular: filtros -->
    <TpSheet v-if="showFilters" title="Filtros" @close="showFilters = false">
      <div class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Fechas</span>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="rangeFrom" type="date" :max="rangeTo || today" aria-label="Desde" :class="fieldInput" @change="period = 'range'" />
          <input v-model="rangeTo" type="date" :min="rangeFrom" :max="today" aria-label="Hasta" :class="fieldInput" @change="period = 'range'" />
        </div>
      </div>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Cuenta</span>
        <select v-model="accountId" :class="fieldInput">
          <option value="">Todas las cuentas</option>
          <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Categoría</span>
        <select v-model="categoryId" :class="fieldInput">
          <option value="">Todas las categorías</option>
          <option v-for="cat in sortedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </label>
      <template #footer>
        <TpButton variant="secondary" class="flex-1" @click="clearFilters">Quitar filtros</TpButton>
        <TpButton class="flex-1" @click="showFilters = false">Ver {{ items.length }}</TpButton>
      </template>
    </TpSheet>

    <TxDetail
      v-if="detail"
      :key="detail.id"
      :tx="detail"
      @close="detail = null"
      @edit="tx => { detail = null; form = { transaction: tx } }"
      @duplicate="prefill => { detail = null; form = { prefill } }"
    />
    <TxForm v-if="form" :transaction="form.transaction" :prefill="form.prefill" @close="form = null" />
  </TpLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Search, SearchX, SlidersHorizontal } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import TxDetail from '@/components/tp/TxDetail.vue'
import TxForm from '@/components/tp/TxForm.vue'
import { dayTitle, fieldInput, fieldLabel, isTransfer, mediumDate, money, parseISO, signedAmount, txIcon } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import { addDaysISO, dateInMonth, toISODate, todayISO } from '@/utils/dates'
import type { Transaction } from '@/interfaces'

const store = useFinanceStore()
const ready = computed(() => store.loaded.transactions && store.loaded.accounts)
const today = todayISO()

// ---------- Clases que se repiten ----------
const iconBtn =
  'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'
const searchBox =
  'flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-100 px-4 text-ink-faint focus-within:border-primary [&_svg]:size-[18px] [&_svg]:shrink-0'
const searchInput = 'min-w-0 flex-1 bg-transparent font-sans text-sm text-ink placeholder:text-ink-faint focus:outline-none'
const statBox = 'flex flex-col gap-1 rounded-card border border-line bg-surface-100 px-4 py-3.5'
const chip = 'min-h-9 shrink-0 cursor-pointer rounded-full border px-4 text-[13px]/[18px] font-medium whitespace-nowrap transition-colors'
const chipOn = 'border-ink bg-ink text-on-inverse'
const chipOff = 'border-line bg-surface-100 text-ink-muted hover:text-ink'
// Fechas y listas de la fila de filtros (escritorio), con forma de píldora
const pillField =
  'hidden min-h-10 cursor-pointer rounded-full border border-line bg-surface-100 px-4 font-sans text-[13px] text-ink [color-scheme:dark] ' +
  'focus:border-primary focus:outline-none lg:block [&>option]:bg-surface-200'
const thClass = 'border-b border-line px-4 py-3 text-left text-[11px]/[14px] font-semibold tracking-[0.5px] text-ink-faint uppercase'
const tdClass = 'border-b border-line px-4 py-3 align-middle'

// ---------- Filtros ----------
type Period = 'month' | '7' | '30' | 'last' | 'range'
type Kind = '' | 'expense' | 'income' | 'transfer'

const periods: { value: Period; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: 'last', label: 'Mes pasado' },
  { value: 'range', label: 'Rango de fechas' }
]
const kinds: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' }
]

const period = ref<Period>('month')
const kind = ref<Kind>('')
const search = ref('')
// Desde el detalle de una cuenta llega ?account=<id>
const route = useRoute()
const accountId = ref(typeof route.query.account === 'string' ? route.query.account : '')
const categoryId = ref('')
const rangeFrom = ref(addDaysISO(today, -29))
const rangeTo = ref(today)
const showFilters = ref(false)

function setPeriod(value: Period) {
  period.value = value
  // En el celular el rango se elige en la hoja de filtros
  if (value === 'range' && window.matchMedia('(max-width: 1023px)').matches) showFilters.value = true
}

const range = computed(() => {
  const now = new Date()
  switch (period.value) {
    case '7':
      return { from: addDaysISO(today, -6), to: today }
    case '30':
      return { from: addDaysISO(today, -29), to: today }
    case 'last':
      return {
        from: toISODate(dateInMonth(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0))
      }
    case 'range':
      return { from: rangeFrom.value || '0000-00-00', to: rangeTo.value || today }
    default:
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      }
  }
})

const periodLabel = computed(() => {
  if (period.value === 'month') {
    const s = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  if (period.value === 'range') return `Del ${mediumDate(parseISO(range.value.from))} al ${mediumDate(parseISO(range.value.to))}`
  return periods.find(p => p.value === period.value)?.label || ''
})

const extraFilters = computed(() => !!(accountId.value || categoryId.value || period.value === 'range'))
const hasAnyFilter = computed(() => extraFilters.value || !!kind.value || !!search.value.trim() || period.value !== 'month')

function clearFilters() {
  period.value = 'month'
  kind.value = ''
  search.value = ''
  accountId.value = ''
  categoryId.value = ''
  showFilters.value = false
}

const sortedCategories = computed(() =>
  [...store.categories].filter(c => c.id !== 'transfer').sort((a, b) => a.name.localeCompare(b.name))
)

const accountName = (id?: string) => (id && store.getAccountById(id)?.name) || ''
const categoryName = (id: string) => store.getCategoryById(id)?.name || 'Sin categoría'

// La otra mitad de una transferencia: mismo día y monto, tipo contrario, otra cuenta
function pairOf(tx: Transaction) {
  return store.transactions.find(
    t => t.id !== tx.id && t.category === 'transfer' && t.date === tx.date && t.amount === tx.amount && t.type !== tx.type && t.accountId !== tx.accountId
  )
}

// ---------- Movimientos filtrados ----------
const filtered = computed(() => {
  const { from, to } = range.value
  const q = search.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')

  return store.transactions
    .filter(t => t.date >= from && t.date <= to)
    .filter(t => {
      if (kind.value === 'transfer') return isTransfer(t)
      if (kind.value) return t.type === kind.value && !isTransfer(t)
      return true
    })
    .filter(t => !accountId.value || t.accountId === accountId.value)
    .filter(t => !categoryId.value || t.category === categoryId.value)
    .filter(t => {
      if (!q) return true
      const text = `${t.description} ${categoryName(t.category)} ${accountName(t.accountId)}`.toLowerCase()
      return text.includes(q) || (digits.length >= 3 && String(Math.round(t.amount)).includes(digits))
    })
    .sort((a, b) => b.date.localeCompare(a.date))
})

// Una transferencia se muestra una sola vez (la salida, con "Desde → Hacia")
const items = computed(() =>
  filtered.value
    .filter(t => {
      if (!isTransfer(t) || t.type !== 'income') return true
      const pair = pairOf(t)
      return !pair || !filtered.value.some(f => f.id === pair.id)
    })
    .map(tx => {
      const transfer = isTransfer(tx)
      const pair = transfer ? pairOf(tx) : undefined
      const from = tx.type === 'expense' ? tx.accountId : pair?.accountId
      const to = tx.type === 'income' ? tx.accountId : pair?.accountId
      const account = transfer && pair ? `${accountName(from)} → ${accountName(to)}` : accountName(tx.accountId)
      const category = transfer ? 'Transferencia' : categoryName(tx.category)
      return {
        tx,
        title: tx.description || category,
        category,
        account,
        meta: `${category} · ${account}`,
        amount: signedAmount(tx),
        income: tx.type === 'income' && !transfer,
        icon: txIcon(tx),
        note: tx.installments && tx.installments > 1 ? `${tx.installments} cuotas` : ''
      }
    })
)

// Paginación: se muestran de a 60
const PAGE = 60
const limit = ref(PAGE)
watch([range, kind, search, accountId, categoryId], () => (limit.value = PAGE))

const groups = computed(() => {
  const list: { date: string; title: string; items: typeof items.value }[] = []
  items.value.slice(0, limit.value).forEach(item => {
    const last = list[list.length - 1]
    if (last?.date === item.tx.date) last.items.push(item)
    else list.push({ date: item.tx.date, title: dayTitle(item.tx.date), items: [item] })
  })
  return list
})

// ---------- Resumen ----------
const totals = computed(() => {
  let income = 0
  let expense = 0
  filtered.value.forEach(t => {
    if (isTransfer(t)) return
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  })
  return { income, expense }
})

const stats = computed(() => [
  { label: 'Ingresos', value: `+${money(totals.value.income).replace('$ ', '')}`, class: 'text-success' },
  { label: 'Gastos', value: `−${money(totals.value.expense).replace('$ ', '')}`, class: '' }
])

// Gastos por categoría: las 4 más grandes y el resto junto
const palette = ['#5f7fe8', '#b9cbff', '#f5bd4f', '#4ade96', '#c5b4ff']
const byCategory = computed(() => {
  const sums = new Map<string, number>()
  filtered.value.forEach(t => {
    if (t.type === 'expense' && !isTransfer(t)) sums.set(t.category, (sums.get(t.category) || 0) + t.amount)
  })
  const total = [...sums.values()].reduce((a, b) => a + b, 0)
  if (!total) return []
  const sorted = [...sums.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 4).map(([id, amount], i) => ({ id, name: categoryName(id), amount, color: palette[i] }))
  const rest = sorted.slice(4).reduce((a, [, v]) => a + v, 0)
  const list = rest ? [...top, { id: '', name: 'Resto', amount: rest, color: '#253157' }] : top
  return list.map(c => ({ ...c, pct: Math.round((c.amount / total) * 100) }))
})

// ---------- Detalle y formulario ----------
const detail = ref<Transaction | null>(null)
const form = ref<{ transaction?: Transaction; prefill?: Partial<Transaction> } | null>(null)

function openNew() {
  form.value = {}
}

onMounted(() => {
  store.loadAccounts()
  store.loadTransactions()
})
</script>
