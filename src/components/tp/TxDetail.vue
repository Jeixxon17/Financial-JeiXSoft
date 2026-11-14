<template>
  <TpSheet title="Movimiento" @close="emit('close')">
    <!-- Encabezado: ícono, descripción y monto -->
    <div class="flex flex-col items-center gap-2.5 pt-1 pb-1 text-center">
      <span class="grid grid-cols-[minmax(0,1fr)] size-16 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-7">
        <component :is="txIcon(tx)" :stroke-width="1.75" aria-hidden="true" />
      </span>
      <span class="text-[15px]/[22px] text-ink-muted">{{ title }}</span>
      <span class="text-[40px]/[46px] font-semibold tracking-[-1px] tabular-nums" :class="{ 'text-success': tx.type === 'income' && !transfer }">
        {{ amountText }}
      </span>
      <div v-if="chips.length" class="flex flex-wrap justify-center gap-1.5">
        <span
          v-for="chip in chips"
          :key="chip"
          class="inline-flex items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold"
        >
          {{ chip }}
        </span>
      </div>
    </div>

    <!-- Datos -->
    <div class="flex flex-col overflow-hidden rounded-card border border-line">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex justify-between gap-4 border-b border-line px-4 py-3 text-sm text-ink-muted last:border-b-0"
      >
        <span>{{ row.label }}</span>
        <strong class="text-right font-semibold text-ink tabular-nums">{{ row.value }}</strong>
      </div>
    </div>

    <p v-if="transfer" class="m-0 text-[13px]/[19px] text-ink-faint">
      Una transferencia son dos movimientos (sale de una cuenta y entra a la otra). Si la eliminas, se quitan los dos.
    </p>

    <template #footer>
      <TpButton v-if="!transfer" variant="secondary" class="flex-1 lg:flex-none" @click="emit('duplicate', duplicatePrefill)">
        <Copy :stroke-width="1.75" aria-hidden="true" />
        Duplicar
      </TpButton>
      <TpButton variant="danger" class="flex-1 lg:flex-none" @click="confirming = true">
        <Trash2 :stroke-width="1.75" aria-hidden="true" />
        Eliminar
      </TpButton>
      <TpButton v-if="!transfer" class="flex-1 lg:flex-none" @click="emit('edit', tx)">
        <Pencil :stroke-width="1.75" aria-hidden="true" />
        Editar
      </TpButton>
    </template>
  </TpSheet>

  <TpConfirm
    v-if="confirming"
    :title="transfer ? '¿Eliminar la transferencia?' : '¿Eliminar este movimiento?'"
    :text="transfer ? 'Se quitan los dos movimientos y los saldos vuelven a como estaban. No se puede deshacer.' : 'Los saldos se recalculan sin él. No se puede deshacer.'"
    :busy="deleting"
    @cancel="confirming = false"
    @confirm="remove"
  >
    <p class="m-0 flex justify-between gap-3 rounded-tile bg-surface-200 px-4 py-3 text-sm">
      <strong class="truncate font-semibold">{{ title }}</strong>
      <span class="font-semibold whitespace-nowrap tabular-nums">{{ amountText }}</span>
    </p>
  </TpConfirm>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Pencil, Trash2 } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import TpConfirm from './TpConfirm.vue'
import { isTransfer, mediumDate, money, parseISO, txIcon, txTypeLabel } from './format'
import { useFinanceStore } from '@/stores/finance'
import type { Transaction } from '@/interfaces'

const props = defineProps<{ tx: Transaction }>()
const emit = defineEmits<{
  close: []
  edit: [tx: Transaction]
  duplicate: [prefill: Partial<Transaction>]
}>()

const store = useFinanceStore()
const transfer = computed(() => isTransfer(props.tx))

// La otra mitad de una transferencia: mismo día y monto, tipo contrario, otra cuenta
const pair = computed(() =>
  transfer.value
    ? store.transactions.find(
        t =>
          t.id !== props.tx.id &&
          t.category === 'transfer' &&
          t.date === props.tx.date &&
          t.amount === props.tx.amount &&
          t.type !== props.tx.type &&
          t.accountId !== props.tx.accountId
      )
    : undefined
)

const accountName = (id?: string) => (id && store.getAccountById(id)?.name) || '—'
const categoryName = computed(() => store.getCategoryById(props.tx.category)?.name || 'Sin categoría')

const title = computed(() => props.tx.description || (transfer.value ? 'Transferencia' : categoryName.value))

const amountText = computed(() => {
  if (transfer.value) return money(props.tx.amount)
  return `${props.tx.type === 'income' ? '+' : '−'}${money(props.tx.amount)}`
})

const chips = computed(() => {
  const list: string[] = []
  if (props.tx.installments && props.tx.installments > 1) list.push(`${props.tx.installments} cuotas`)
  if (props.tx.tags?.includes('moneda extranjera')) list.push('Moneda extranjera')
  if (props.tx.tags?.includes('comisión')) list.push('Comisión del banco')
  if (props.tx.recurringId) list.push('Gasto automático')
  return list
})

const rows = computed(() => {
  const tx = props.tx
  const list: { label: string; value: string }[] = [{ label: 'Tipo', value: txTypeLabel(tx) }]

  if (transfer.value) {
    const from = tx.type === 'expense' ? tx.accountId : pair.value?.accountId
    const to = tx.type === 'income' ? tx.accountId : pair.value?.accountId
    list.push({ label: 'Desde', value: accountName(from) })
    list.push({ label: 'Hacia', value: accountName(to) })
  } else {
    list.push({ label: tx.type === 'income' ? 'Entró a' : 'Cuenta', value: accountName(tx.accountId) })
    list.push({ label: 'Categoría', value: categoryName.value })
  }

  const event = tx.eventId ? store.events.find(e => e.id === tx.eventId) : undefined
  if (event) list.push({ label: 'Viaje o evento', value: event.name })

  list.push({ label: 'Fecha', value: mediumDate(parseISO(tx.date)) })
  if (tx.paymentMethod && !transfer.value) list.push({ label: 'Medio', value: tx.paymentMethod })

  if (tx.installments) {
    const rate = tx.installments > 1 && tx.interestRate ? ` · ${tx.interestRate} % mes` : ' · sin intereses'
    list.push({
      label: 'Cuotas',
      value: `${tx.installments} de ${money(tx.installmentAmount || tx.amount / tx.installments)}${rate}`
    })
  }
  return list
})

// Duplicar: los mismos datos con la fecha de hoy
const duplicatePrefill = computed<Partial<Transaction>>(() => ({
  type: props.tx.type,
  amount: props.tx.amount,
  category: props.tx.category,
  accountId: props.tx.accountId,
  description: props.tx.description
}))

const confirming = ref(false)
const deleting = ref(false)

async function remove() {
  deleting.value = true
  // Se toma la otra mitad antes de borrar: después la lista ya cambió
  const other = pair.value
  try {
    await store.deleteTransaction(props.tx.id)
    if (other) await store.deleteTransaction(other.id)
    confirming.value = false
    emit('close')
  } finally {
    deleting.value = false
  }
}
</script>
