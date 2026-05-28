<template>
  <AppLayout>
    <div class="paychecks-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Control de Quincenas</h1>
          <p class="subtitle">
            Gestiona salario, deducciones y obligaciones por quincena
          </p>
        </div>

        <div class="header-actions">
          <button class="btn-secondary" @click="showDeductionModal = true">
            + Deducción
          </button>

          <button class="btn-add" @click="showModal = true">
            + Obligación
          </button>
        </div>
      </div>

      <!-- Salary Resume -->
      <div class="salary-resume">
        <div class="salary-card primary">
          <span class="salary-label">💼 Salario mensual</span>
          <strong class="salary-value mono">
            {{ formatCurrency(monthlySalary) }}
          </strong>
        </div>

        <div class="salary-card red">
          <span class="salary-label">📉 Deducciones</span>
          <strong class="salary-value mono">
            {{ formatCurrency(totalDeductions) }}
          </strong>
        </div>

        <div class="salary-card green">
          <span class="salary-label">💰 Salario real</span>
          <strong class="salary-value mono">
            {{ formatCurrency(netSalary) }}
          </strong>
        </div>

        <div class="salary-card blue">
          <span class="salary-label">📆 Por quincena</span>
          <strong class="salary-value mono">
            {{ formatCurrency(quincenaAmount) }}
          </strong>
        </div>
      </div>

      <!-- Quincenas -->
      <div class="quincenas-grid">
        <!-- 15 -->
        <div class="quincena-card">
          <div class="quincena-header">
            <div>
              <h2>1° Quincena (15)</h2>
              <p>Obligaciones y pagos</p>
            </div>

            <div class="quincena-total">
              {{ formatCurrency(quincenaAmount) }}
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-top">
              <span>Comprometido</span>
              <span>{{ quincena15Percent.toFixed(0) }}%</span>
            </div>

            <div class="progress-bar">
              <div
                class="progress-fill fill-blue"
                :style="{ width: `${Math.min(quincena15Percent, 100)}%` }"
              />
            </div>

            <div class="progress-values">
              <span>{{ formatCurrency(quincena15Total) }}</span>
              <strong class="green">
                {{ formatCurrency(quincenaAmount - quincena15Total) }}
              </strong>
            </div>
          </div>

          <div class="payments-list">
            <div
              v-for="item in quincena15"
              :key="item.id"
              class="payment-item"
            >
              <div class="payment-left">
                <div class="payment-icon">
                  {{ item.icon || '💳' }}
                </div>

                <div>
                  <p class="payment-name">{{ item.name }}</p>
                  <span class="payment-category">
                    {{ item.category }}
                  </span>
                </div>
              </div>

              <div class="payment-right">
                <strong class="mono">
                  {{ formatCurrency(item.amount) }}
                </strong>

                <div class="item-actions">
                  <button
                    class="icon-btn"
                    @click="editItem(item)"
                  >
                    ✏️
                  </button>

                  <button
                    class="icon-btn danger"
                    @click="removeItem(item.id)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!quincena15.length" class="empty-payments">
              Sin obligaciones registradas
            </div>
          </div>
        </div>

        <!-- 30 -->
        <div class="quincena-card">
          <div class="quincena-header">
            <div>
              <h2>2° Quincena (30)</h2>
              <p>Obligaciones y pagos</p>
            </div>

            <div class="quincena-total">
              {{ formatCurrency(quincenaAmount) }}
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-top">
              <span>Comprometido</span>
              <span>{{ quincena30Percent.toFixed(0) }}%</span>
            </div>

            <div class="progress-bar">
              <div
                class="progress-fill fill-purple"
                :style="{ width: `${Math.min(quincena30Percent, 100)}%` }"
              />
            </div>

            <div class="progress-values">
              <span>{{ formatCurrency(quincena30Total) }}</span>
              <strong class="green">
                {{ formatCurrency(quincenaAmount - quincena30Total) }}
              </strong>
            </div>
          </div>

          <div class="payments-list">
            <div
              v-for="item in quincena30"
              :key="item.id"
              class="payment-item"
            >
              <div class="payment-left">
                <div class="payment-icon">
                  {{ item.icon || '💳' }}
                </div>

                <div>
                  <p class="payment-name">{{ item.name }}</p>
                  <span class="payment-category">
                    {{ item.category }}
                  </span>
                </div>
              </div>

              <div class="payment-right">
                <strong class="mono">
                  {{ formatCurrency(item.amount) }}
                </strong>

                <div class="item-actions">
                  <button
                    class="icon-btn"
                    @click="editItem(item)"
                  >
                    ✏️
                  </button>

                  <button
                    class="icon-btn danger"
                    @click="removeItem(item.id)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!quincena30.length" class="empty-payments">
              Sin obligaciones registradas
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>

  <!-- MODAL OBLIGACIONES -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="modal-backdrop"
      @click.self="closeModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>
            {{ editingItem ? 'Editar obligación' : 'Nueva obligación' }}
          </h2>

          <button @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nombre</label>

              <input
                v-model="form.name"
                type="text"
                placeholder="Ej: Casa"
              />
            </div>

            <div class="form-group">
              <label>Monto</label>

              <input
                v-model.number="form.amount"
                type="number"
                placeholder="0"
              />
            </div>

            <div class="form-group">
              <label>Quincena</label>

              <select v-model="form.quincena">
                <option value="15">15</option>
                <option value="30">30</option>
              </select>
            </div>

            <div class="form-group">
              <label>Categoría</label>

              <input
                v-model="form.category"
                type="text"
                placeholder="Servicios"
              />
            </div>

            <div class="form-group">
              <label>Icono</label>

              <input
                v-model="form.icon"
                type="text"
                placeholder="🏠"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">
            Cancelar
          </button>

          <button
            class="btn-save"
            @click="saveItem"
            :disabled="!form.name || !form.amount"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- MODAL DEDUCCIONES -->
  <Teleport to="body">
    <div
      v-if="showDeductionModal"
      class="modal-backdrop"
      @click.self="closeDeductionModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>Nueva deducción</h2>

          <button @click="closeDeductionModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nombre</label>

              <input
                v-model="deductionForm.name"
                type="text"
                placeholder="Ej: Salud"
              />
            </div>

            <div class="form-group full">
              <label>Valor</label>

              <input
                v-model.number="deductionForm.amount"
                type="number"
                placeholder="0"
              />
            </div>
          </div>

          <div class="deductions-list">
            <div
              v-for="item in deductions"
              :key="item.id"
              class="deduction-item"
            >
              <span>{{ item.name }}</span>

              <div class="deduction-right">
                <strong class="mono">
                  {{ formatCurrency(item.amount) }}
                </strong>

                <button
                  class="icon-btn danger"
                  @click="removeDeduction(item.id)"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeDeductionModal">
            Cerrar
          </button>

          <button
            class="btn-save"
            @click="saveDeduction"
            :disabled="!deductionForm.name || !deductionForm.amount"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  onMounted
} from 'vue'

import AppLayout from '@/layouts/AppLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'

const store = useFinanceStore()

const showModal = ref(false)
const showDeductionModal = ref(false)

const editingItem = ref<any | null>(null)

const form = reactive({
  name: '',
  amount: 0,
  quincena: '15' as '15' | '30',
  category: '',
  icon: '💳'
})

const deductionForm = reactive({
  name: '',
  amount: 0
})

onMounted(async () => {

  await store.loadPaychecks()

  // Si no existe registro inicial
  if (!store.currentPaycheck) {

    await store.addPaycheck({
  label: 'Salario Principal',

  monthlySalary: 2887696,

  amount: 2887696,

  date: new Date().toISOString(),

  description: '',

  status: 'received',

  spent: 0,

  deductions: [],

  debts: []
})

    await store.loadPaychecks()
  }
})

const paycheck = computed(() =>
  store.currentPaycheck
)

const monthlySalary = computed(() =>
  paycheck.value?.monthlySalary || 0
)

const deductions = computed(() =>
  paycheck.value?.deductions || []
)

const totalDeductions = computed(() =>
  store.totalSalaryDeductions
)

const netSalary = computed(() =>
  store.netSalary
)

const quincenaAmount = computed(() =>
  store.quincenaValue
)

const quincena15 = computed(() =>
  store.quincena15Debts
)

const quincena30 = computed(() =>
  store.quincena30Debts
)

const quincena15Total = computed(() =>
  store.quincena15Total
)

const quincena30Total = computed(() =>
  store.quincena30Total
)

const quincena15Percent = computed(() => {

  if (!quincenaAmount.value) return 0

  return (
    (quincena15Total.value / quincenaAmount.value)
    * 100
  )
})

const quincena30Percent = computed(() => {

  if (!quincenaAmount.value) return 0

  return (
    (quincena30Total.value / quincenaAmount.value)
    * 100
  )
})

async function saveItem() {

  if (!paycheck.value) return

  const debts = [...(paycheck.value.debts || [])]

  const data = {
  id: editingItem.value?.id || crypto.randomUUID(),

  name: form.name,

  amount: form.amount,

  quincena: form.quincena,

  category: form.category,

  paid: false,

  icon: form.icon
}

  if (editingItem.value) {

    const index = debts.findIndex(
      item => item.id === editingItem.value.id
    )

    if (index !== -1) {
      debts[index] = data
    }

  } else {

    debts.push(data)
  }

  await store.updatePaycheck(
    paycheck.value.id,
    {
      debts
    }
  )

  closeModal()
}

function editItem(item: any) {

  editingItem.value = item

  Object.assign(form, item)

  showModal.value = true
}

async function removeItem(id: string) {

  if (!paycheck.value) return

  const debts =
    paycheck.value.debts.filter(
      item => item.id !== id
    )

  await store.updatePaycheck(
    paycheck.value.id,
    {
      debts
    }
  )
}

async function saveDeduction() {

  if (!paycheck.value) return

  const deductions = [
    ...(paycheck.value.deductions || [])
  ]

  deductions.push({
    id: crypto.randomUUID(),
    name: deductionForm.name,
    amount: deductionForm.amount
  })

  await store.updatePaycheck(
    paycheck.value.id,
    {
      deductions
    }
  )

  deductionForm.name = ''
  deductionForm.amount = 0
}

async function removeDeduction(id: string) {

  if (!paycheck.value) return

  const deductions =
    paycheck.value.deductions.filter(
      item => item.id !== id
    )

  await store.updatePaycheck(
    paycheck.value.id,
    {
      deductions
    }
  )
}

function closeModal() {

  showModal.value = false

  editingItem.value = null

  Object.assign(form, {
    name: '',
    amount: 0,
    quincena: '15',
    category: '',
    icon: '💳'
  })
}

function closeDeductionModal() {

  showDeductionModal.value = false

  deductionForm.name = ''
  deductionForm.amount = 0
}
</script>

<style scoped>
.paychecks-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-muted);
  font-size: 13px;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.salary-resume {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.salary-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.salary-card.primary {
  border-left: 4px solid var(--accent-blue);
}

.salary-card.red {
  border-left: 4px solid var(--accent-red);
}

.salary-card.green {
  border-left: 4px solid var(--accent-green);
}

.salary-card.blue {
  border-left: 4px solid var(--accent-purple);
}

.salary-label {
  font-size: 12px;
  color: var(--text-muted);
}

.salary-value {
  font-size: 24px;
  color: var(--text-primary);
}

.quincenas-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.quincena-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quincena-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.quincena-header h2 {
  font-size: 18px;
  color: var(--text-primary);
}

.quincena-header p {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.quincena-total {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-green);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-top,
.progress-values {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.progress-top {
  color: var(--text-muted);
}

.progress-bar {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
}

.fill-blue {
  background: var(--accent-blue);
}

.fill-purple {
  background: var(--accent-purple);
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.payment-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.payment-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.payment-category {
  font-size: 11px;
  color: var(--text-muted);
}

.payment-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.item-actions {
  display: flex;
  gap: 6px;
}

.empty-payments {
  padding: 30px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.deductions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.deduction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
}

.deduction-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-add,
.btn-save {
  background: linear-gradient(
    135deg,
    var(--accent-green),
    #00b377
  );

  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  color: #000;
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 18px;
  color: var(--text-primary);
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 18px;
  color: var(--text-primary);
  cursor: pointer;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  width: 100%;
  max-width: 520px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.form-group input,
.form-group select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  color: var(--text-primary);
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  cursor: pointer;
}

.icon-btn.danger {
  color: var(--accent-red);
}

.green {
  color: var(--accent-green);
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 900px) {
  .quincenas-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .btn-add,
  .btn-secondary {
    flex: 1;
  }
}
</style>