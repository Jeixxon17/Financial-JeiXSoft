<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar movimiento' : 'Nuevo movimiento' }}</h2>
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

  <select v-model="form.category">
    <option value="">
      Seleccionar...
    </option>

    <option
      v-for="cat in filteredCategories"
      :key="cat.id"
      :value="cat.id"
    >
      {{ cat.icon }} {{ cat.name }}
    </option>
  </select>
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

            <div class="form-group">
              <label>Método de pago</label>
              <select v-model="form.paymentMethod">
                <option v-for="m in paymentMethods" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Etiquetas</label>
              <input
                v-model="tagsInput"
                type="text"
                placeholder="fijo, mensual..."
                @blur="parseTags"
              />
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
import { ref, computed, reactive } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, getCurrentMonth } from '@/utils/formatters'
import type { Transaction } from '@/interfaces'

const props = defineProps<{
  transaction?: Transaction
}>()

const emit = defineEmits(['close'])
const store = useFinanceStore()
const editing = !!props.transaction
const isSaving = ref(false)
const form = reactive({
  type: props.transaction?.type || 'expense' as 'income' | 'expense' | 'transfer',
  amount: props.transaction?.amount || 0,
  date: props.transaction?.date || new Date().toISOString().split('T')[0],
  category: props.transaction?.category || '',
  accountId: props.transaction?.accountId || '',
  targetAccountId: '',
  description: props.transaction?.description || '',
  paymentMethod: props.transaction?.paymentMethod || 'Transferencia',
  tags: props.transaction?.tags || [] as string[]
})

const tagsInput = ref(form.tags.join(', '))

const types = [
  { value: 'expense', label: 'Gasto', icon: '📤' },
  { value: 'income', label: 'Ingreso', icon: '📥' },
  { value: 'transfer', label: 'Transferencia', icon: '↔️' }
]

const paymentMethods = [
  'Transferencia', 'Débito', 'Crédito', 'Efectivo', 'PSE', 'Nequi', 'Daviplata', 'QR', 'Débito automático'
]

const destinationAccounts = computed(() =>
  store.accounts.filter(
    acc => acc.id !== form.accountId
  )
)

const filteredCategories = computed(() => {
  return store.categories.filter(c =>
    c.type === 'both' ||
    (form.type === 'income' ? c.type === 'income' : c.type === 'expense')
  )
})

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
    form.date
  )
})

function parseTags() {
  form.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
}

async function save() {

  if( isSaving.value ) return

  isSaving.value = true

  try {
    parseTags()

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

    emit('close')
    return
  }

  const data = {
    type: form.type,
    amount: form.amount,
    date: form.date,
    category: form.category,
    accountId: form.accountId,
    description: form.description,
    paymentMethod: form.paymentMethod,
    tags: form.tags
  }

  if (editing && props.transaction) {
    await store.updateTransaction(
      props.transaction.id,
      data
    )
  } else {
    await store.addTransaction(data)
  }

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
