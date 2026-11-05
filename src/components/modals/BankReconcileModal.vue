<template>
  <!-- Cuadrar la tarjeta con lo que muestra hoy la app del banco -->
  <TpSheet :title="`Cuadrar ${account.name} con el banco`" @close="!busy && $emit('close')">
    <p class="m-0 text-sm text-ink-muted">
      Escribe lo que muestra hoy la app del banco y la tarjeta queda igual. Úsalo después de pagar o si ves alguna diferencia.
    </p>

    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Pago total / deuda total</span>
      <input v-model.number="totalDebt" type="number" min="0" :class="fieldInput" :placeholder="money(current.usedCredit)" />
      <small class="text-xs text-ink-faint">En la app: {{ money(current.usedCredit) }}</small>
    </label>

    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Cupo usado</span>
      <input v-model.number="limitUsed" type="number" min="0" :class="fieldInput" :placeholder="money(current.limitUsed)" />
      <small class="text-xs text-ink-faint">En la app: {{ money(current.limitUsed) }}. Si lo dejas vacío se calcula con la deuda.</small>
    </label>

    <label v-if="separate" class="flex flex-col gap-1.5">
      <span :class="fieldLabel">{{ separate.description }} pendiente</span>
      <input v-model.number="separatePending" type="number" min="0" :class="fieldInput" :placeholder="money(current.separateDebt)" />
      <small class="text-xs text-ink-faint">En la app: {{ money(current.separateDebt) }} (aparte del cupo)</small>
    </label>

    <div v-if="preview" class="grid grid-cols-2 gap-2">
      <div class="flex flex-col gap-0.5 rounded-tile bg-surface-200 px-3 py-2.5">
        <span class="text-[11px]/[14px] text-ink-faint">Cupo disponible</span>
        <strong class="font-semibold text-success tabular-nums">{{ money(preview.available) }}</strong>
      </div>
      <div class="flex flex-col gap-0.5 rounded-tile bg-surface-200 px-3 py-2.5">
        <span class="text-[11px]/[14px] text-ink-faint">Saldo sin detalle</span>
        <strong class="font-semibold tabular-nums">{{ signed(preview.placeholder) }}</strong>
      </div>
    </div>

    <p v-if="error" class="m-0 text-sm text-danger">{{ error }}</p>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" :disabled="busy" @click="$emit('close')">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="busy || !totalDebt" @click="apply">
        {{ busy ? 'Guardando…' : 'Cuadrar' }}
      </TpButton>
    </template>
  </TpSheet>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { fieldInput, fieldLabel, money } from '@/components/tp/format'
import { todayISO } from '@/utils/dates'
import type { Account, DeferredDebt } from '@/interfaces'

const props = defineProps<{ account: Account }>()
const emit = defineEmits(['close'])
const store = useFinanceStore()

const current = computed(() => store.calculateAccountBalance(props.account.id))
const separate = computed(() => props.account.deferredDebts?.find(d => d.outsideLimit))

const totalDebt = ref<number | null>(null)
const limitUsed = ref<number | null>(null)
const separatePending = ref<number | null>(null)
const busy = ref(false)
const error = ref('')

const signed = (n: number) => money(n)
const PLACEHOLDER = 'Ajuste deuda total'

// Deuda diferida nueva: el crédito aparte y el saldo sin detalle quedan desde
// hoy (la cuota de este corte ya se pagó o ya está en el mínimo)
function nextDeferred(): { deferred: DeferredDebt[]; placeholder: number } {
  const today = todayISO()
  const deferred = (props.account.deferredDebts || []).map(d => ({ ...d }))
  let debt = current.value.usedCredit

  const sep = deferred.find(d => d.outsideLimit)
  if (sep && separatePending.value != null && separatePending.value >= 0) {
    const perCuota = sep.amount / Math.max(1, sep.installments)
    // La deuda de la app cuenta el valor guardado del crédito aparte
    debt += separatePending.value - sep.amount
    sep.installments = Math.max(1, Math.round(separatePending.value / perCuota))
    sep.amount = separatePending.value
    sep.date = today
  }

  // Lo que falte para la deuda total va al saldo sin detalle, con la misma cuota
  const delta = Math.round(((totalDebt.value || 0) - debt) * 100) / 100
  let placeholder = deferred.find(d => d.description.startsWith(PLACEHOLDER))
  if (Math.abs(delta) >= 1) {
    if (placeholder) {
      const perCuota = Math.abs(placeholder.amount) / Math.max(1, placeholder.installments) || 1
      placeholder.amount = Math.round((placeholder.amount + delta) * 100) / 100
      placeholder.installments = Math.max(1, Math.round(Math.abs(placeholder.amount) / perCuota))
      placeholder.date = today
    } else {
      placeholder = { id: `def_${Date.now()}`, description: `${PLACEHOLDER} (según el banco)`, amount: delta, installments: 1, date: today }
      deferred.push(placeholder)
    }
  }
  return { deferred, placeholder: placeholder?.amount || 0 }
}

const preview = computed(() => {
  if (!totalDebt.value) return null
  const used = limitUsed.value ?? (totalDebt.value - (separatePending.value ?? current.value.separateDebt))
  return {
    available: (props.account.creditLimit || 0) - used,
    placeholder: nextDeferred().placeholder
  }
})

async function apply() {
  if (!totalDebt.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const updates: Partial<Account> = { deferredDebts: nextDeferred().deferred }
    if (limitUsed.value != null && limitUsed.value >= 0) {
      updates.limitUsedAnchor = {
        amount: limitUsed.value,
        date: todayISO(),
        minimumCovered: store.getCreditStatement(props.account.id).isMinimumCovered
      }
    }
    await store.updateAccount(props.account.id, updates)
    emit('close')
  } catch (e) {
    error.value = (e as Error).message || 'No se pudo cuadrar.'
  } finally {
    busy.value = false
  }
}
</script>
