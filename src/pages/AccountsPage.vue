<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_200px]">
        <h1 :class="pageTitle">Cuentas y tarjetas</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">
          <TpSkeleton v-if="!ready" class="inline-block h-3.5 w-40 rounded-chip align-middle" />
          <template v-else>{{ subtitle }}</template>
        </p>
      </div>
      <button type="button" :class="[iconBtn, 'border-primary bg-primary text-white lg:hidden']" aria-label="Agregar cuenta" @click="form = { account: null }">
        <Plus :stroke-width="1.75" aria-hidden="true" />
      </button>
      <div class="hidden lg:block">
        <TpButton @click="form = { account: null }">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Agregar cuenta
        </TpButton>
      </div>
    </div>

    <!-- ===== Resumen ===== -->
    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      <div v-for="stat in stats" :key="stat.label" class="flex flex-col gap-1 rounded-card border border-line bg-surface-100 px-4 py-3.5">
        <span class="text-xs text-ink-faint">{{ stat.label }}</span>
        <TpSkeleton v-if="!ready" class="my-0.5 block h-5 w-24 rounded-chip" />
        <strong v-else class="text-lg/6 font-semibold tabular-nums lg:text-[22px]/7" :class="stat.class">{{ stat.value }}</strong>
      </div>
    </div>

    <!-- ===== Tarjetas ===== -->
    <section class="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]" aria-label="Tus cuentas y tarjetas" :aria-busy="!ready">
      <template v-if="!ready">
        <BankCardSkeleton v-for="n in 3" :key="n" />
      </template>
      <template v-else>
        <button
          v-for="(card, i) in cards"
          :key="card.id"
          type="button"
          class="cursor-pointer rounded-card text-left transition-transform duration-250 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-light"
          :aria-label="`Ver ${card.name}`"
          @click="detailId = card.id"
        >
          <span :class="[bankCardClass, 'relative h-full animate-card-in motion-reduce:animate-none']" :style="{ animationDelay: `${i * 0.06}s` }">
            <BankCardFace :card="card" />
          </span>
        </button>
        <button
          type="button"
          class="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-card border-[1.5px] border-dashed border-line-strong bg-[#0b1229] text-center text-ink transition-colors hover:border-accent-light"
          :class="{ 'animate-breathe motion-reduce:animate-none': !cards.length }"
          @click="form = { account: null }"
        >
          <span class="grid grid-cols-[minmax(0,1fr)] size-[52px] place-items-center rounded-full bg-primary text-white"><Plus :size="24" :stroke-width="2" aria-hidden="true" /></span>
          <strong class="text-base font-semibold">{{ cards.length ? 'Agregar cuenta o tarjeta' : 'Agrega tu primera cuenta' }}</strong>
          <small class="text-[13px]/[18px] text-ink-muted">Ahorros, débito, efectivo o tarjeta de crédito</small>
        </button>
      </template>
    </section>
  </TpLayout>

  <AccountDetail
    v-if="detailAccount"
    :key="detailAccount.id"
    :account="detailAccount"
    @close="detailId = null"
    @pay="acc => { detailId = null; payCard = acc.id }"
    @statement="acc => { detailId = null; withConsent('statements', () => (statementAccount = acc)) }"
    @reconcile="acc => { detailId = null; reconcileAccount = acc }"
    @edit="acc => { detailId = null; form = { account: acc } }"
  />
  <AccountForm v-if="form" :account="form.account" @close="form = null" />
  <TxForm v-if="payCard" :pay-card="payCard" @close="payCard = null" />
  <StatementImportModal v-if="statementAccount" :key="statementAccount.id" :account="statementAccount" @close="statementAccount = null" />
  <BankReconcileModal v-if="reconcileAccount" :key="'r' + reconcileAccount.id" :account="reconcileAccount" @close="reconcileAccount = null" />
  <!-- Autorización para leer extractos (la primera vez) -->
  <ConsentSheet v-if="asking" :kind="asking" @accept="accepted" @cancel="cancelled" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import BankCardFace from '@/components/tp/BankCardFace.vue'
import BankCardSkeleton from '@/components/tp/BankCardSkeleton.vue'
import AccountDetail from '@/components/tp/AccountDetail.vue'
import AccountForm from '@/components/tp/AccountForm.vue'
import TxForm from '@/components/tp/TxForm.vue'
import StatementImportModal from '@/components/modals/StatementImportModal.vue'
import BankReconcileModal from '@/components/modals/BankReconcileModal.vue'
import ConsentSheet from '@/components/legal/ConsentSheet.vue'
import { useConsent } from '@/services/consent.service'
import { bankCardClass } from '@/components/tp/cards'
import { useAccountCards } from '@/components/tp/useAccountCards'
import { money } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import type { Account } from '@/interfaces'

const store = useFinanceStore()
const { cards } = useAccountCards()
const ready = computed(() => store.loaded.accounts && store.loaded.transactions)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const iconBtn =
  'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'

const subtitle = computed(() => {
  const n = store.accounts.length
  const withDebt = store.accounts.filter(a => a.type === 'credit' && store.calculateAccountBalance(a.id).usedCredit > 0).length
  if (!n) return 'Aún no tienes cuentas'
  return `${n} ${n === 1 ? 'cuenta' : 'cuentas'}${withDebt ? ` · ${withDebt} con deuda` : ''}`
})

// Mínimos que faltan por pagar en los extractos actuales
const pendingMinimums = computed(() =>
  store.accounts
    .filter(a => a.type === 'credit')
    .reduce((sum, a) => {
      const st = store.getCreditStatement(a.id)
      return st && !st.isMinimumCovered ? sum + st.minimumPayment : sum
    }, 0)
)

const stats = computed(() => [
  { label: 'Saldo en cuentas', value: money(store.totalBalance), class: '' },
  { label: 'Deuda total', value: money(store.totalDebt), class: '' },
  { label: 'Cupo disponible', value: money(store.availableCredit), class: 'text-success' },
  { label: 'Mínimos por pagar', value: money(pendingMinimums.value), class: pendingMinimums.value ? 'text-warning' : '' }
])

// Hojas y modales
const detailId = ref<string | null>(null)
const detailAccount = computed(() => store.accounts.find(a => a.id === detailId.value) || null)
const form = ref<{ account: Account | null } | null>(null)
const payCard = ref<string | null>(null)
const statementAccount = ref<Account | null>(null)
const { asking, withConsent, accepted, cancelled } = useConsent()
const reconcileAccount = ref<Account | null>(null)

onMounted(() => {
  store.loadAccounts()
  store.loadTransactions()
})
</script>
