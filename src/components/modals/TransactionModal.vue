<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ title || (editing ? 'Editar movimiento' : 'Nuevo movimiento') }}</h2>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <!-- Type tabs -->
          <div class="type-tabs">
            <button
              v-for="t in types"
              :key="t.value"
              class="type-tab"
              :class="{ active: form.type === t.value, [`tab-${t.value}`]: true }"
              @click="form.type = t.value as any"
            >
              {{ t.icon }} {{ t.label }}
            </button>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Monto *</label>
              <div class="amount-input">
                <span class="currency-prefix">$</span>
                <input
                  v-model.number="form.amount"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Fecha *</label>
              <input v-model="form.date" type="date" />
            </div>

            <div
  v-if="form.type !== 'transfer'"
  class="form-group"
>
  <label>Categoría *</label>

  <CategorySelect
    v-model="form.category"
    :type="form.type === 'income' ? 'income' : 'expense'"
  />
</div>

<div
  v-else
  class="form-group"
>
  <label>Cuenta destino *</label>

  <select v-model="form.targetAccountId">
    <option value="">
      Seleccionar...
    </option>

    <option
      v-for="acc in destinationAccounts"
      :key="acc.id"
      :value="acc.id"
    >
      {{ acc.icon }} {{ acc.name }}
    </option>
  </select>
</div>

            <div class="form-group">
              <label>Cuenta *</label>
              <select v-model="form.accountId">
                <option value="">Seleccionar...</option>
                <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">
                  {{ acc.icon }} {{ acc.name }}
                </option>
              </select>
            </div>

            <div class="form-group full">
              <label>Descripción</label>
              <input v-model="form.description" type="text" placeholder="Ej: Mercado semanal..." />
            </div>

          </div>

          <!-- Compra en moneda extranjera: la tarjeta cobra una comisión aparte -->
          <label v-if="showFx" class="fx-box">
            <input v-model="form.foreignCurrency" type="checkbox" />
            <span>
              🌎 Compra en moneda extranjera (USD)
              <small v-if="form.foreignCurrency && form.amount > 0">
                Se registra aparte la comisión del {{ fxRate }} %: {{ formatCurrency(fxFee) }}
              </small>
              <small v-else>La tarjeta cobra {{ fxRate }} % por cambio de moneda</small>
            </span>
          </label>

          <!-- Credit installments -->
          <div class="installments-box" v-if="showInstallments">
            <div class="installments-header">
              <span>💳 Compra a cuotas</span>
            </div>

            <div class="installment-chips">
              <button
                v-for="n in quickInstallments"
                :key="n"
                type="button"
                class="installment-chip"
                :class="{ active: form.installments === n }"
                @click="form.installments = n"
              >
                {{ n }}
              </button>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Número de cuotas *</label>
                <input
                  v-model.number="form.installments"
                  type="number"
                  min="1"
                  max="48"
                  step="1"
                />
              </div>

              <div class="form-group">
                <label>Interés mensual (%)</label>
                <input
                  v-model.number="form.interestRate"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0"
                  :disabled="form.installments <= 1"
                  @input="rateTouched = true"
                />
              </div>
            </div>

            <p class="installments-hint" v-if="form.installments <= 1">
              A 1 cuota no se cobran intereses.
            </p>
            <p class="installments-hint" v-else-if="form.interestRate > 0">
              {{ form.interestRate }} % mensual ({{ annualRate.toFixed(2) }} % E.A.) sobre el saldo que se debe.
              Si la compra es sin intereses, pon 0.
            </p>

            <div class="installments-summary" v-if="form.amount > 0 && form.installments >= 1">
              <div>
                <span>{{ form.installments > 1 && form.interestRate > 0 ? 'Primera cuota' : 'Cuota mensual' }}</span>
                <strong>{{ formatCurrency(installmentAmount) }}</strong>
              </div>
              <div>
                <span>Intereses</span>
                <strong>{{ formatCurrency(totalInterest) }}</strong>
              </div>
              <div>
                <span>Total a pagar</span>
                <strong>{{ formatCurrency(totalToPay) }}</strong>
              </div>
            </div>

            <div class="schedule" v-if="form.amount > 0 && form.installments > 1 && form.interestRate > 0">
              <div class="schedule-row schedule-head">
                <span>Cuota</span><span>Capital</span><span>Interés</span><span>Total</span>
              </div>
              <div v-for="row in schedule" :key="row.number" class="schedule-row">
                <span>{{ row.number }}/{{ schedule.length }}</span>
                <span>{{ formatCurrency(row.capital) }}</span>
                <span>{{ formatCurrency(row.interest) }}</span>
                <strong>{{ formatCurrency(row.total) }}</strong>
              </div>
            </div>
          </div>

          <!-- Amount preview -->
          <div class="amount-preview" v-if="form.amount > 0">
            <span :class="form.type === 'income' ? 'preview-income' : 'preview-expense'">
              {{ form.type === 'income' ? '+' : '-' }} {{ formatCurrency(form.amount) }}
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="$emit('close')">Cancelar</button>
          <button @click="save" :disabled="!isValid || isSaving" :class="isSaving ? 'btn-save-disabled' : 'btn-save'">
            {{ isSaving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { showAdvice } from '@/services/advisorToast'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, getCurrentMonth } from '@/utils/formatters'
import CategorySelect from '@/components/CategorySelect.vue'
import type { Transaction } from '@/interfaces'
import { effectiveAnnualRate, installmentSchedule } from '@/utils/installments'
import { todayISO } from '@/utils/dates'

const props = defineProps<{
  transaction?: Transaction
  // Datos iniciales para un movimiento nuevo (ej: leído de una notificación)
  prefill?: Partial<Transaction>
  title?: string
}>()

const emit = defineEmits(['close', 'saved'])
const store = useFinanceStore()
const editing = !!props.transaction
const isSaving = ref(false)
const initial = props.transaction || props.prefill
const form = reactive({
  type: initial?.type || 'expense' as 'income' | 'expense' | 'transfer',
  amount: initial?.amount || 0,
  date: initial?.date || todayISO(),
  category: initial?.category || '',
  accountId: initial?.accountId || '',
  targetAccountId: '',
  description: initial?.description || '',
  installments: props.transaction?.installments || 1,
  interestRate: props.transaction?.interestRate || 0,
  foreignCurrency: false
})

const types = [
  { value: 'expense', label: 'Gasto', icon: '📤' },
  { value: 'income', label: 'Ingreso', icon: '📥' },
  { value: 'transfer', label: 'Transferencia', icon: '↔️' }
]

// El método de pago se deduce del tipo de cuenta
const paymentMethodByAccountType: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  savings: 'Ahorros',
  cash: 'Efectivo'
}

const quickInstallments = [1, 3, 6, 12, 24, 36]

const selectedAccount = computed(() =>
  store.getAccountById(form.accountId)
)

// Comisión por cambio de moneda de la tarjeta (solo al crear un gasto)
const fxRate = computed(() => selectedAccount.value?.fxFeeRate || 0)
const showFx = computed(() => !editing && form.type === 'expense' && fxRate.value > 0)
const fxFee = computed(() => Math.round(form.amount * fxRate.value) / 100)

const showInstallments = computed(() =>
  form.type === 'expense' && selectedAccount.value?.type === 'credit'
)

// Al editar se respeta la tasa guardada; en compras nuevas se toma la de la tarjeta
const rateTouched = ref(editing)

watch(
  () => [form.accountId, form.installments],
  () => {
    if (rateTouched.value || !showInstallments.value) return
    const freeUpTo = selectedAccount.value?.interestFreeInstallments || 1
    form.interestRate = form.installments > freeUpTo ? selectedAccount.value?.interestRate || 0 : 0
  }
)

// Capital fijo y el interés mensual sobre el saldo pendiente (como el banco)
const schedule = computed(() =>
  installmentSchedule(form.amount, form.installments || 1, form.interestRate || 0)
)

// La primera cuota es la más alta: el interés va bajando con el saldo
const installmentAmount = computed(() => Math.round(schedule.value[0]?.total || 0))

const totalInterest = computed(() =>
  Math.round(schedule.value.reduce((sum, row) => sum + row.interest, 0))
)

const totalToPay = computed(() => Math.round(form.amount + totalInterest.value))

const annualRate = computed(() => effectiveAnnualRate(form.interestRate || 0))

const destinationAccounts = computed(() =>
  store.accounts.filter(
    acc => acc.id !== form.accountId
  )
)

const isValid = computed(() => {

  if (form.type === 'transfer') {
    return (
      form.amount > 0 &&
      form.accountId &&
      form.targetAccountId &&
      form.date
    )
  }

  return (
    form.amount > 0 &&
    form.category &&
    form.accountId &&
    form.date &&
    (!showInstallments.value ||
      (Number.isInteger(form.installments) && form.installments >= 1 && form.installments <= 48 && form.interestRate >= 0))
  )
})

async function save() {

  if( isSaving.value ) return

  isSaving.value = true

  try {
  if (!isValid.value) return

  if (form.type === 'transfer') {

    await store.addTransaction({
      type: 'expense',
      amount: form.amount,
      date: form.date,
      category: 'transfer',
      accountId: form.accountId,
      description: `Transferencia a ${
        store.getAccountById(
          form.targetAccountId
        )?.name
      }`,
      paymentMethod: 'Transferencia',
      tags: ['transfer']
    })

    await store.addTransaction({
      type: 'income',
      amount: form.amount,
      date: form.date,
      category: 'transfer',
      accountId: form.targetAccountId,
      description: `Transferencia desde ${
        store.getAccountById(
          form.accountId
        )?.name
      }`,
      paymentMethod: 'Transferencia',
      tags: ['transfer']
    })

    emit('saved')
    emit('close')
    return
  }

  const data: Omit<Transaction, 'id'> = {
    type: form.type,
    amount: form.amount,
    date: form.date,
    category: form.category,
    accountId: form.accountId,
    description: form.description,
    paymentMethod: paymentMethodByAccountType[selectedAccount.value?.type || ''] || '',
    tags: props.transaction?.tags || []
  }

  // Firestore no acepta undefined: solo se agregan si es compra a crédito
  if (showInstallments.value) {
    data.installments = form.installments
    data.interestRate = form.installments > 1 ? form.interestRate || 0 : 0
    data.installmentAmount = installmentAmount.value
  }

  const withFxFee = showFx.value && form.foreignCurrency && fxFee.value > 0
  if (withFxFee) data.tags = [...data.tags, 'moneda extranjera']

  if (editing && props.transaction) {
    await store.updateTransaction(
      props.transaction.id,
      data
    )
  } else {
    await store.addTransaction(data)
  }

  // La comisión por cambio de moneda va como un gasto aparte, igual que en el banco
  if (withFxFee) {
    const fee: Omit<Transaction, 'id'> = {
      type: 'expense',
      amount: fxFee.value,
      date: form.date,
      category: await store.getFeesCategoryId(),
      accountId: form.accountId,
      description: `Comisión cambio de moneda${form.description ? ` · ${form.description}` : ''}`,
      paymentMethod: data.paymentMethod,
      tags: ['comisión']
    }
    if (showInstallments.value) {
      fee.installments = 1
      fee.interestRate = 0
      fee.installmentAmount = fxFee.value
    }
    await store.addTransaction(fee)
  }

  // El asesor comenta cada gasto nuevo (presupuesto, ritmo del mes, deuda)
  if (!editing) showAdvice(store.feedbackFor(data))

  emit('saved')
  emit('close')
  } finally {
    isSaving.value = false
  }
  
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  animation: fadeInUp 0.3s ease;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

.modal-body {
  padding: 24px;
}

.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: var(--bg-elevated);
  border-radius: 12px;
  padding: 4px;
}

.type-tab {
  flex: 1;
  padding: 10px 8px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.type-tab.active.tab-expense {
  background: var(--accent-red-dim);
  color: var(--accent-red);
}

.type-tab.active.tab-income {
  background: var(--accent-green-dim);
  color: var(--accent-green);
}

.type-tab.active.tab-transfer {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-green);
}

.amount-input {
  position: relative;
}

.currency-prefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
  pointer-events: none;
}

.amount-input input {
  padding-left: 24px;
}

.fx-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.fx-box input {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  accent-color: var(--accent-green);
  flex-shrink: 0;
}

.fx-box small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}

.installments-box {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.installments-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.installment-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.installment-chip {
  min-width: 40px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.installment-chip.active {
  border-color: var(--accent-blue);
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.installments-box .form-group input {
  background: var(--bg-surface);
}

.installments-summary {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.installments-summary div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: var(--bg-surface);
  border-radius: 8px;
}

.installments-summary span {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.installments-summary strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-primary);
}

@media (max-width: 480px) {
  .installments-summary { grid-template-columns: 1fr; }
  .installment-chips { flex-wrap: nowrap; }
  .installment-chip { flex: 1; min-width: 0; padding-left: 0; padding-right: 0; }
  .schedule-row { gap: 4px; font-size: 11px; }
}

.installments-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.schedule {
  margin-top: 12px;
  max-height: 180px;
  overflow-y: auto;
  border-radius: 8px;
  background: var(--bg-surface);
  padding: 6px 10px;
}

.schedule-row {
  display: grid;
  grid-template-columns: 0.7fr 1fr 1fr 1fr;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary, var(--text-muted));
}

.schedule-row strong { color: var(--text-primary); font-weight: 600; }

.schedule-head {
  font-family: inherit;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.amount-preview {
  margin-top: 16px;
  text-align: center;
  padding: 12px;
  background: var(--bg-elevated);
  border-radius: 10px;
}

.preview-income {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-green);
}

.preview-expense {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-red);
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}

.btn-cancel:hover { border-color: var(--border-light); color: var(--text-primary); }

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 4px 12px rgba(0, 214, 143, 0.25);
}

.btn-save-disabled{
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 6px 20px rgba(0, 214, 143, 0.4);
  transform: translateY(-1px);
}

.btn-save:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(0, 214, 143, 0.4);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

option {
  background: var(--bg-elevated);
}
</style>
