<template>
  <TpSheet :title="account.name" wide @close="emit('close')">
    <div class="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <!-- Tarjeta -->
      <div :class="[bankCardClass, 'relative']">
        <BankCardFace :card="card" />
      </div>

      <!-- Datos -->
      <div class="grid grid-cols-[minmax(0,1fr)] gap-x-6 sm:grid-cols-2">
        <div
          v-for="row in card.rows"
          :key="row.label"
          class="flex justify-between gap-3 border-b border-line py-2.5 text-sm text-ink-muted"
        >
          <span>{{ row.label }}</span>
          <strong class="text-right font-semibold text-ink tabular-nums">{{ row.value }}</strong>
        </div>
      </div>
    </div>

    <p v-if="isCredit && !account.cutoffDate" class="m-0 rounded-tile border border-line bg-surface-200 px-4 py-3 text-[13px]/[19px] text-warning">
      Configura el día de corte (Editar) para ver el pago mínimo y la fecha límite.
    </p>

    <!-- Acciones -->
    <div class="flex flex-wrap gap-2">
      <TpButton v-if="isCredit" @click="emit('pay', account)">
        <CreditCard :stroke-width="1.75" aria-hidden="true" />
        Pagar
      </TpButton>
      <TpButton v-if="isCredit" variant="secondary" @click="requirePlan('statements') && emit('statement', account)">
        <FileText :stroke-width="1.75" aria-hidden="true" />
        Subir extracto
      </TpButton>
      <TpButton v-if="isCredit" variant="secondary" @click="requirePlan('statements') && emit('reconcile', account)">
        <Scale :stroke-width="1.75" aria-hidden="true" />
        Cuadrar con el banco
      </TpButton>
      <TpButton variant="secondary" @click="emit('edit', account)">
        <Pencil :stroke-width="1.75" aria-hidden="true" />
        Editar
      </TpButton>
      <TpButton variant="danger" @click="confirming = true">
        <Trash2 :stroke-width="1.75" aria-hidden="true" />
        Eliminar
      </TpButton>
    </div>

    <!-- Movimientos -->
    <section class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="m-0 font-sans text-[17px]/6 font-semibold">{{ periodTitle }}</h3>
        <RouterLink :to="{ path: '/transactions', query: { account: account.id } }" class="text-[13px] font-medium text-ink no-underline hover:text-accent-light">
          Ver todos
        </RouterLink>
      </div>
      <p v-if="!moves.length" class="m-0 rounded-tile bg-surface-200/40 px-4 py-5 text-center text-sm text-ink-faint">Sin movimientos en este período.</p>
      <div v-for="tx in moves" :key="tx.id" class="flex items-center gap-3 rounded-tile bg-surface-200/40 px-4 py-2.5">
        <span class="grid grid-cols-[minmax(0,1fr)] size-9 shrink-0 place-items-center rounded-full bg-surface-300 [&_svg]:size-4">
          <component :is="txIcon(tx)" :stroke-width="1.75" aria-hidden="true" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-semibold">{{ tx.description || categoryName(tx) }}</span>
          <span class="text-xs text-ink-faint">
            {{ shortDate(parseISO(tx.date)) }}
            <template v-if="tx.installments && tx.installments > 1"> · {{ tx.installments }} cuotas</template>
            <template v-if="tx.installments && tx.installments > 1 && tx.interestRate"> · {{ tx.interestRate }} %</template>
          </span>
        </span>
        <span class="text-sm font-semibold whitespace-nowrap tabular-nums" :class="{ 'text-success': tx.type === 'income' && !isTransfer(tx) }">
          {{ signedAmount(tx) }}
        </span>
      </div>
    </section>
  </TpSheet>

  <TpConfirm
    v-if="confirming"
    :title="`¿Eliminar ${account.name}?`"
    text="Se quita la cuenta. Sus movimientos se quedan en la app, pero sin cuenta. No se puede deshacer."
    :busy="deleting"
    @cancel="confirming = false"
    @confirm="remove"
  />
</template>

<script setup lang="ts">
import { requirePlan } from '@/services/plan.service'
import { computed, ref } from 'vue'
import { CreditCard, FileText, Pencil, Scale, Trash2 } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import TpConfirm from './TpConfirm.vue'
import BankCardFace from './BankCardFace.vue'
import { bankCardClass } from './cards'
import { useAccountCards } from './useAccountCards'
import { isTransfer, parseISO, shortDate, signedAmount, txIcon } from './format'
import { useFinanceStore } from '@/stores/finance'
import { toISODate } from '@/utils/dates'
import type { Account, Transaction } from '@/interfaces'

const props = defineProps<{ account: Account }>()
const emit = defineEmits<{
  close: []
  pay: [account: Account]
  statement: [account: Account]
  reconcile: [account: Account]
  edit: [account: Account]
}>()

const store = useFinanceStore()
const { toCard } = useAccountCards()
const card = computed(() => toCard(props.account))
const isCredit = computed(() => props.account.type === 'credit')

// Tarjetas: lo del período actual (desde el último corte). Cuentas: lo más reciente
const statement = computed(() => (isCredit.value ? store.getCreditStatement(props.account.id) : null))
const periodStart = computed(() => (statement.value?.lastCutoff ? toISODate(statement.value.lastCutoff) : ''))

const periodTitle = computed(() => {
  if (statement.value?.lastCutoff && statement.value.nextCutoff) {
    return `Período ${shortDate(statement.value.lastCutoff)} – ${shortDate(statement.value.nextCutoff)}`
  }
  return 'Últimos movimientos'
})

const moves = computed(() =>
  store.transactions
    .filter(t => t.accountId === props.account.id && (!periodStart.value || t.date > periodStart.value))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
)

const categoryName = (tx: Transaction) =>
  isTransfer(tx) ? 'Transferencia' : store.getCategoryById(tx.category)?.name || 'Sin categoría'

const confirming = ref(false)
const deleting = ref(false)

async function remove() {
  deleting.value = true
  try {
    await store.deleteAccount(props.account.id)
    confirming.value = false
    emit('close')
  } finally {
    deleting.value = false
  }
}
</script>
