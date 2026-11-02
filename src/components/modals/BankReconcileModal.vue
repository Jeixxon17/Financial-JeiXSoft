<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!busy && $emit('close')">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Cuadrar con el banco</h2>
            <p class="subtitle">{{ account.icon }} {{ account.name }}</p>
          </div>
          <button class="modal-close" :disabled="busy" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <p class="hint">
            Escribe lo que muestra hoy la app del banco y esta tarjeta queda igual. Úsalo después de pagar o si
            ves alguna diferencia.
          </p>

          <div class="form-group">
            <label>Pago total / deuda total *</label>
            <input v-model.number="totalDebt" type="number" min="0" :placeholder="formatCurrency(current.usedCredit)" />
            <small>En la app: {{ formatCurrency(current.usedCredit) }}</small>
          </div>

          <div class="form-group">
            <label>Cupo usado</label>
            <input v-model.number="limitUsed" type="number" min="0" :placeholder="formatCurrency(current.limitUsed)" />
            <small>
              En la app: {{ formatCurrency(current.limitUsed) }}.
              Sin cupo usado se calcula con la deuda.
            </small>
          </div>

          <div v-if="separate" class="form-group">
            <label>{{ separate.description }} pendiente</label>
            <input v-model.number="separatePending" type="number" min="0" :placeholder="formatCurrency(current.separateDebt)" />
            <small>En la app: {{ formatCurrency(current.separateDebt) }} (aparte del cupo)</small>
          </div>

          <div v-if="preview" class="preview">
            <div><span>Cupo disponible</span><strong>{{ formatCurrency(preview.available) }}</strong></div>
            <div><span>Saldo sin detalle</span><strong>{{ signed(preview.placeholder) }}</strong></div>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" :disabled="busy" @click="$emit('close')">Cancelar</button>
          <button class="btn-save" :disabled="busy || !totalDebt" @click="apply">
            {{ busy ? 'Guardando...' : 'Cuadrar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'
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

const signed = (n: number) => `${n < 0 ? '-' : ''}${formatCurrency(n)}`
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

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 460px;
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
}

.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 0; }
.modal-header h2 { font-size: 19px; color: var(--text-primary); }
.subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.modal-close { background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; }

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 18px;
  border-top: 1px solid var(--border);
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.form-group small { font-size: 12px; color: var(--text-muted); }

.form-group input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
}

.hint { font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.error { font-size: 13px; color: var(--accent-red); }

.preview { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.preview div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; background: var(--bg-elevated); }
.preview span { font-size: 11px; color: var(--text-muted); }
.preview strong { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-primary); }

.btn-cancel,
.btn-save { padding: 10px 18px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.btn-cancel { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); }
.btn-save { border: none; background: linear-gradient(135deg, var(--accent-green), #00b377); color: #000; font-weight: 600; }
.btn-save:disabled,
.btn-cancel:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 480px) {
  .modal-backdrop { padding: 10px; align-items: flex-end; }
}
</style>
