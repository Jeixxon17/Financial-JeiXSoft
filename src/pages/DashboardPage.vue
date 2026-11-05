<template>
  <TpLayout>
    <!-- ===== Celular: saldo arriba ===== -->
    <header class="flex items-center gap-3 lg:hidden">
      <span class="grid grid-cols-[minmax(0,1fr)] size-11 shrink-0 place-items-center rounded-full border border-line bg-surface-200">
        <img :src="symbol" alt="" width="26" height="26" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-sm text-ink-muted">Saldo disponible</span>
        <span v-if="balanceReady" class="text-[22px]/7 font-semibold tabular-nums">{{ money(store.totalBalance) }}</span>
        <TpSkeleton v-else class="my-0.5 block h-6 w-36 rounded-chip" />
      </div>
      <RouterLink
        to="/budgets"
        class="relative grid size-10 place-items-center rounded-full border border-line-strong text-ink [&_svg]:size-[18px]"
        aria-label="Avisos del asesor"
      >
        <Bell :stroke-width="1.75" aria-hidden="true" />
        <span v-if="tip && tipReady" class="absolute top-[7px] right-2 size-2 rounded-full border-2 border-bg-base bg-warning" />
      </RouterLink>
    </header>

    <!-- ===== Escritorio: barra superior ===== -->
    <div class="hidden flex-wrap items-center gap-3 lg:flex">
      <div class="min-w-0 flex-[1_1_240px]">
        <h1 class="m-0 font-sans text-[26px]/8 font-semibold tracking-[-0.3px]">{{ greeting }}</h1>
        <p class="mt-0.5 text-sm text-ink-muted">
          {{ today }} · Saldo disponible
          <strong v-if="balanceReady" class="font-semibold text-ink">{{ money(store.totalBalance) }}</strong>
          <TpSkeleton v-else class="inline-block h-3.5 w-24 rounded-chip align-middle" />
        </p>
      </div>
      <RouterLink
        to="/transactions"
        class="flex min-h-11 flex-[0_1_300px] items-center gap-2 rounded-full border border-line bg-surface-100 px-4 text-sm text-ink-faint no-underline transition-colors hover:border-line-strong hover:text-ink-muted [&_svg]:size-[18px]"
      >
        <Search :stroke-width="1.75" aria-hidden="true" />
        Buscar movimientos
      </RouterLink>
      <TpButton @click="openTx('expense')">
        <Plus :stroke-width="1.75" aria-hidden="true" />
        Registrar movimiento
      </TpButton>
    </div>

    <!-- ===== Cargando las cuentas ===== -->
    <template v-if="!accountsReady">
      <section class="pt-[30px] lg:hidden" aria-busy="true" aria-label="Cargando tus cuentas">
        <BankCardSkeleton class="h-[240px]" />
      </section>
      <section class="hidden grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 lg:grid" aria-busy="true" aria-label="Cargando tus cuentas">
        <BankCardSkeleton v-for="n in 3" :key="n" />
      </section>
    </template>

    <!-- ===== Sin cuentas todavía ===== -->
    <RouterLink
      v-else-if="!cards.length"
      to="/accounts"
      class="flex min-h-[190px] animate-breathe flex-col items-center justify-center gap-2.5 rounded-card border-[1.5px] border-dashed border-line-strong bg-[#0b1229] text-center text-ink no-underline motion-reduce:animate-none"
    >
      <span class="grid grid-cols-[minmax(0,1fr)] size-[52px] place-items-center rounded-full bg-primary text-white">
        <Plus :size="24" :stroke-width="2" aria-hidden="true" />
      </span>
      <strong class="text-base font-semibold">Agrega tu primera cuenta</strong>
      <small class="text-[13px]/[18px] text-ink-muted">Ahorros, efectivo o una tarjeta de crédito</small>
    </RouterLink>

    <template v-else>
      <!-- Celular: carrusel de tarjetas apiladas -->
      <section class="flex flex-col gap-2.5 pt-[30px] lg:hidden" aria-label="Tus cuentas y tarjetas">
        <div class="relative h-[262px] perspective-[900px]" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <button
            v-for="(card, i) in cards"
            :key="card.id"
            type="button"
            :class="[
              bankCardClass,
              'absolute inset-x-0 top-0 h-[240px] w-full cursor-pointer transition-[transform,opacity] duration-[550ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none'
            ]"
            :style="stackStyle(i)"
            :tabindex="stackPos(i) === 0 ? 0 : -1"
            :aria-label="`${card.name}. ${card.labelA} ${card.valueA}. ${stackPos(i) === 0 ? 'Toca para ver la siguiente' : ''}`"
            @click="pickCard(i)"
          >
            <BankCardFace :card="card" />
          </button>
        </div>
        <div v-if="cards.length > 1" class="flex justify-center gap-1.5" aria-hidden="true">
          <span
            v-for="(card, i) in cards"
            :key="card.id"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="i === front ? 'w-[18px] bg-accent-light' : 'w-1.5 bg-surface-300'"
          />
        </div>
      </section>

      <!-- Escritorio: tarjetas lado a lado; la elegida se ve a la derecha -->
      <section class="hidden grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 lg:grid" aria-label="Tus cuentas y tarjetas">
        <button
          v-for="(card, i) in cards"
          :key="card.id"
          type="button"
          class="cursor-pointer rounded-card text-left transition-transform duration-250 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-light"
          :class="{ 'outline-2 outline-offset-4 outline-accent-light': card.id === selected?.id }"
          :aria-pressed="card.id === selected?.id"
          @click="selectedId = card.id"
        >
          <span
            :class="[bankCardClass, 'relative h-full animate-card-in motion-reduce:animate-none']"
            :style="{ animationDelay: `${i * 0.08}s` }"
          >
            <BankCardFace :card="card" />
          </span>
        </button>
      </section>
    </template>

    <!-- Celular: acciones rápidas -->
    <nav class="grid grid-cols-4 gap-2 lg:hidden" aria-label="Acciones rápidas">
      <button type="button" :class="actionClass" @click="openTx('expense')">
        <span :class="[actionIcon, 'border-primary bg-primary text-white']"><ArrowDown :stroke-width="1.75" aria-hidden="true" /></span>
        Gasto
      </button>
      <button type="button" :class="actionClass" @click="openTx('income')">
        <span :class="[actionIcon, actionIconIdle]"><ArrowUp :stroke-width="1.75" aria-hidden="true" /></span>
        Ingreso
      </button>
      <button type="button" :class="actionClass" @click="openTx('transfer')">
        <span :class="[actionIcon, actionIconIdle]"><CreditCard :stroke-width="1.75" aria-hidden="true" /></span>
        Pagar
      </button>
      <button type="button" :class="actionClass" @click="showMore = true">
        <span :class="[actionIcon, actionIconIdle]"><LayoutGrid :stroke-width="1.75" aria-hidden="true" /></span>
        Más
      </button>
    </nav>

    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:gap-6 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <!-- Movimientos recientes -->
      <div class="flex min-w-0 flex-col gap-4">
        <!-- Celular: el aviso y los pendientes van antes de los movimientos -->
        <HomeNotice v-if="tip && tipReady" class="lg:hidden" :tip="tip" />
        <TpSkeleton v-else-if="!tipReady" class="block h-[88px] rounded-tile lg:hidden" />
        <RouterLink v-if="pending > 0" to="/inbox" :class="[bannerClass, 'lg:hidden']">
          {{ pendingText }}
          <ArrowRight :stroke-width="1.75" aria-hidden="true" />
        </RouterLink>

        <div class="flex items-baseline justify-between gap-3">
          <h2 :class="sectionTitle">Movimientos recientes</h2>
          <RouterLink to="/transactions" :class="sectionLink">Ver todo</RouterLink>
        </div>

        <!-- Cargando los movimientos: filas con la misma forma que las reales -->
        <template v-if="!txReady">
          <div class="flex flex-col gap-2 lg:hidden" aria-busy="true" aria-label="Cargando movimientos">
            <div v-for="n in 4" :key="n" class="flex items-center gap-3 rounded-tile bg-surface-100 px-4 py-3">
              <TpSkeleton class="block size-10 shrink-0 rounded-full" />
              <span class="flex flex-1 flex-col gap-2">
                <TpSkeleton class="block h-3.5 rounded-chip" :class="n % 2 ? 'w-32' : 'w-24'" />
                <TpSkeleton class="block h-3 w-20 rounded-chip" />
              </span>
              <TpSkeleton class="block h-4 w-20 rounded-chip" />
            </div>
          </div>
          <div class="hidden overflow-hidden rounded-card border border-line bg-surface-100 lg:block" aria-busy="true" aria-label="Cargando movimientos">
            <div class="flex gap-4 border-b border-line px-4 py-3.5">
              <TpSkeleton v-for="w in ['w-24', 'w-20', 'w-16', 'w-12']" :key="w" class="block h-2.5 flex-1 rounded-chip" />
            </div>
            <div v-for="n in 5" :key="n" class="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0">
              <span class="flex flex-1 items-center gap-2.5">
                <TpSkeleton class="block size-8 shrink-0 rounded-full" />
                <TpSkeleton class="block h-3.5 rounded-chip" :class="n % 2 ? 'w-36' : 'w-28'" />
              </span>
              <TpSkeleton class="block h-3.5 w-20 flex-1 rounded-chip" />
              <TpSkeleton class="block h-3.5 w-20 flex-1 rounded-chip" />
              <TpSkeleton class="block h-3.5 w-12 flex-1 rounded-chip" />
              <span class="flex flex-1 justify-end"><TpSkeleton class="block h-3.5 w-20 rounded-chip" /></span>
            </div>
          </div>
        </template>

        <p v-else-if="!recent.length" class="rounded-tile bg-surface-100 p-6 text-center text-sm text-ink-faint">
          Aún no hay movimientos.
        </p>

        <!-- Celular: lista -->
        <div v-if="txReady && recent.length" class="flex flex-col gap-2 lg:hidden">
          <button v-for="tx in recent" :key="tx.id" type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-surface-100 px-4 py-3 text-left transition-colors hover:bg-surface-200" @click="detail = tx.raw">
            <span class="grid grid-cols-[minmax(0,1fr)] size-10 shrink-0 place-items-center rounded-full bg-surface-300">
              <component :is="tx.icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate text-[15px]/[22px] font-semibold">{{ tx.title }}</span>
              <span class="text-xs text-ink-faint">{{ tx.date }} · {{ tx.account }}</span>
            </span>
            <span
              class="text-base/[22px] font-semibold whitespace-nowrap tabular-nums"
              :class="{ 'text-success': tx.income }"
            >
              {{ tx.amount }}
            </span>
          </button>
        </div>

        <!-- Escritorio: tabla -->
        <div v-if="txReady && recent.length" class="hidden overflow-x-auto rounded-card border border-line bg-surface-100 lg:block">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th v-for="h in ['Descripción', 'Categoría', 'Cuenta', 'Fecha']" :key="h" :class="thClass">{{ h }}</th>
                <th :class="[thClass, 'text-right']">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in recent" :key="tx.id" class="cursor-pointer hover:[&>td]:bg-surface-200 [&:last-child>td]:border-b-0" tabindex="0" @click="detail = tx.raw" @keydown.enter="detail = tx.raw">
                <td :class="[tdClass, 'font-semibold text-ink']">
                  <span class="mr-2.5 inline-grid size-8 place-items-center rounded-full bg-surface-300 align-middle [&_svg]:size-4">
                    <component :is="tx.icon" :stroke-width="1.75" aria-hidden="true" />
                  </span>
                  {{ tx.title }}
                </td>
                <td :class="[tdClass, 'text-ink-muted']">{{ tx.category }}</td>
                <td :class="[tdClass, 'text-ink-muted']">{{ tx.account }}</td>
                <td :class="[tdClass, 'text-ink-muted']">{{ tx.date }}</td>
                <td
                  :class="[tdClass, 'text-right font-semibold tabular-nums', tx.income ? 'text-success' : 'text-ink']"
                >
                  {{ tx.amount }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Escritorio: detalle de la tarjeta elegida, aviso y pendientes -->
      <div class="hidden min-w-0 flex-col gap-4 lg:flex">
        <div
          v-if="!accountsReady"
          class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 p-5"
          aria-busy="true"
          aria-label="Cargando el detalle"
        >
          <TpSkeleton class="mb-2 block h-4 w-28 rounded-chip" />
          <div v-for="n in 4" :key="n" class="flex justify-between gap-3 border-b border-line py-3">
            <TpSkeleton class="block h-3.5 w-28 rounded-chip" />
            <TpSkeleton class="block h-3.5 w-20 rounded-chip" />
          </div>
          <TpSkeleton class="mt-2 block h-12 rounded-full" />
        </div>
        <div v-else-if="selected" class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 p-5">
          <span class="text-sm font-medium text-ink-muted">{{ selected.name }}</span>
          <div
            v-for="row in selected.rows"
            :key="row.label"
            class="flex justify-between gap-3 border-b border-line py-2.5 text-sm text-ink-muted"
          >
            <span>{{ row.label }}</span>
            <strong class="font-semibold text-ink tabular-nums">{{ row.value }}</strong>
          </div>
          <TpButton to="/accounts" variant="secondary" block class="mt-2">Ver detalle</TpButton>
        </div>
        <HomeNotice v-if="tip && tipReady" :tip="tip" />
        <TpSkeleton v-else-if="!tipReady" class="block h-[88px] rounded-tile" />
        <RouterLink v-if="pending > 0" to="/inbox" :class="bannerClass">
          {{ pendingText }}
          <ArrowRight :stroke-width="1.75" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>

    <!-- Celular: hoja "Más" -->
    <Teleport to="body">
      <div v-if="showMore" class="fixed inset-0 z-60 font-sans text-ink antialiased">
        <div class="absolute inset-0 bg-[rgba(2,4,12,0.66)] backdrop-blur-[3px]" @click="showMore = false" />
        <div
          class="fixed inset-x-0 bottom-0 flex animate-sheet-in flex-col gap-4 rounded-t-sheet border-t border-line bg-surface-100 px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-float motion-reduce:animate-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="more-title"
        >
          <span class="h-1 w-10 self-center rounded-full bg-surface-300" />
          <h2 id="more-title" :class="sectionTitle">Más</h2>
          <div class="flex flex-col overflow-hidden rounded-card border border-line">
            <RouterLink v-for="link in moreLinks" :key="link.to" :to="link.to" :class="sheetRow">
              <component :is="link.icon" :stroke-width="1.75" aria-hidden="true" />
              <span class="flex-1">{{ link.label }}</span>
              <Lock v-if="link.pro && !hasFullPlan" class="text-ink-faint" :stroke-width="2" aria-label="Plan Completo" />
              <ChevronRight :stroke-width="1.75" aria-hidden="true" />
            </RouterLink>
            <button type="button" :class="sheetRow" @click="lockApp">
              <LockKeyhole :stroke-width="1.75" aria-hidden="true" />
              <span class="flex-1">Bloquear la app</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Registrar gasto, ingreso, transferencia o pago de tarjeta -->
    <TxForm
      v-if="txType"
      :prefill="txType === 'transfer' ? undefined : { type: txType }"
      :pay-card="txType === 'transfer' ? cardToPay : undefined"
      @close="txType = null"
    />

    <!-- Detalle de un movimiento reciente, y editar o duplicar desde ahí -->
    <TxDetail
      v-if="detail"
      :key="detail.id"
      :tx="detail"
      @close="detail = null"
      @edit="tx => { detail = null; editForm = { transaction: tx } }"
      @duplicate="prefill => { detail = null; editForm = { prefill } }"
    />
    <TxForm v-if="editForm" :transaction="editForm.transaction" :prefill="editForm.prefill" @close="editForm = null" />
  </TpLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Lock,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Search
} from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TxForm from '@/components/tp/TxForm.vue'
import TxDetail from '@/components/tp/TxDetail.vue'
import { isTransfer, money, parseISO, signedAmount, txIcon } from '@/components/tp/format'
import type { Transaction } from '@/interfaces'
import BankCardFace from '@/components/tp/BankCardFace.vue'
import BankCardSkeleton from '@/components/tp/BankCardSkeleton.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import HomeNotice from '@/components/tp/HomeNotice.vue'
import { moreLinks } from '@/components/tp/navigation'
import { hasFullPlan } from '@/services/plan.service'
import { bankCardClass } from '@/components/tp/cards'
import { useAccountCards } from '@/components/tp/useAccountCards'
import TpButton from '@/components/tp/TpButton.vue'
import symbol from '@/assets/brand/tuplata-symbol-dark.svg'
import { useFinanceStore } from '@/stores/finance'
import { lockApp } from '@/services/auth.service'
import type { Account } from '@/interfaces'

const store = useFinanceStore()

// Clases que se repiten
const sectionTitle = 'm-0 font-sans text-xl/[26px] font-semibold'
const sectionLink = 'text-[13px]/[18px] font-medium text-ink no-underline hover:text-accent-light'
const bannerClass =
  'flex w-full items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 text-[13px]/[18px] font-medium text-white no-underline shadow-float [&_svg]:size-5 [&_svg]:shrink-0'
const actionClass = 'flex cursor-pointer flex-col items-center gap-3 text-sm font-medium text-ink'
const actionIcon = 'grid size-[52px] place-items-center rounded-full border [&_svg]:size-[22px]'
const actionIconIdle = 'border-line bg-surface-200'
const thClass =
  'border-b border-line px-4 py-3 text-left text-[11px]/[14px] font-semibold tracking-[0.5px] text-ink-faint uppercase'
const tdClass = 'border-b border-line px-4 py-3 align-middle'
const sheetRow =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-line px-4 text-left text-[15px]/[22px] font-medium text-ink no-underline last:border-b-0 [&_svg]:size-5 [&_svg]:shrink-0'

// ---------- Carga desde Firebase (skeleton loaders) ----------
// Cada bloque espera solo lo que necesita. El saldo y las tarjetas (deuda, mínimo,
// cupo) se calculan con cuentas y movimientos; la lista, solo con los movimientos
const balanceReady = computed(() => store.loaded.accounts && store.loaded.transactions)
const accountsReady = balanceReady
const txReady = computed(() => store.loaded.transactions)
// El asesor usa además quincenas y metas: así no aparece un aviso equivocado mientras llegan
const tipReady = computed(
  () => balanceReady.value && store.loaded.paychecks && store.loaded.goals && store.loaded.budgets
)

// ---------- Formatos ----------
// money viene de components/tp/format
// "3 nov" (es-CO da "3 de nov.")
const shortDate = (d: Date) =>
  d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ')

const now = new Date()
const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
const today = (() => {
  const s = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})()

// ---------- Tarjetas (misma lógica que Cuentas) ----------
const { cards } = useAccountCards()

// Celular: carrusel
const front = ref(0)
const stackPos = (i: number) => (i - front.value + cards.value.length) % cards.value.length

function stackStyle(i: number) {
  const pos = stackPos(i)
  const visible = pos < 4
  return {
    transform: `translateY(${[0, -12, -22, -30][pos] ?? -30}px) scale(${[1, 0.94, 0.88, 0.82][pos] ?? 0.8})`,
    opacity: visible ? [1, 0.7, 0.45, 0.25][pos] : 0,
    zIndex: cards.value.length - pos,
    pointerEvents: visible ? undefined : ('none' as const)
  }
}

function step(delta: number) {
  const n = cards.value.length
  if (n) front.value = (front.value + delta + n) % n
}

function pickCard(i: number) {
  if (stackPos(i) === 0) step(1)
  else front.value = i
}

let touchX = 0
const onTouchStart = (e: TouchEvent) => (touchX = e.touches[0].clientX)
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
}

// Escritorio: tarjeta elegida
const selectedId = ref<string | null>(null)
const selected = computed(() => cards.value.find(c => c.id === selectedId.value) ?? cards.value[0])

// ---------- Movimientos recientes ----------
const recent = computed(() =>
  [...store.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    // Una transferencia son dos movimientos: aquí se muestra solo la salida
    .filter(tx => !(isTransfer(tx) && tx.type === 'income'))
    .slice(0, 6)
    .map(tx => {
      const category = isTransfer(tx) ? 'Transferencia' : store.getCategoryById(tx.category)?.name || 'Sin categoría'
      return {
        id: tx.id,
        raw: tx,
        income: tx.type === 'income' && !isTransfer(tx),
        title: tx.description || category,
        category,
        account: store.getAccountById(tx.accountId)?.name || '',
        date: shortDate(parseISO(tx.date)),
        amount: signedAmount(tx),
        icon: txIcon(tx)
      }
    })
)

const detail = ref<Transaction | null>(null)
const editForm = ref<{ transaction?: Transaction; prefill?: Partial<Transaction> } | null>(null)

// ---------- Asesor y pendientes ----------
// El asesor y la bandeja son del plan Completo
const tip = computed(
  () =>
    (hasFullPlan.value &&
      (store.advisorTips.find(t => t.level === 'danger') ?? store.advisorTips.find(t => t.level === 'warn'))) ||
    null
)

const pending = computed(() => (hasFullPlan.value ? store.pendingTransactions.length : 0))
const pendingText = computed(() =>
  pending.value === 1 ? 'Tienes 1 movimiento por confirmar' : `Tienes ${pending.value} movimientos por confirmar`
)

// ---------- Acciones ----------
const txType = ref<'expense' | 'income' | 'transfer' | null>(null)
const showMore = ref(false)

// "Pagar": la tarjeta con el mínimo pendiente que vence primero (o la primera tarjeta)
const cardToPay = computed(() => {
  const cards = store.accounts.filter(a => a.type === 'credit')
  const pendingCards = cards
    .map(a => ({ a, st: store.getCreditStatement(a.id) }))
    .filter(x => x.st && !x.st.isMinimumCovered && x.st.minimumPayment > 0 && x.st.dueDate)
    .sort((x, y) => x.st!.dueDate!.getTime() - y.st!.dueDate!.getTime())
  return pendingCards[0]?.a.id ?? cards[0]?.id
})

function openTx(type: 'expense' | 'income' | 'transfer') {
  showMore.value = false
  txType.value = type
}

onMounted(() => {
  store.loadAccounts()
  store.loadTransactions()
  store.loadPendingTransactions()
})
</script>
