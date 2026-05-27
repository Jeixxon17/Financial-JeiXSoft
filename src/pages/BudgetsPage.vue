<template>
  <AppLayout>
    <div class="budgets-page">
      <div class="page-header">
        <p class="subtitle">Controla tus gastos por categoría</p>
        <button class="btn-add" @click="showModal = true">+ Nuevo presupuesto</button>
      </div>

      <!-- Global summary -->
      <div class="budget-overview">
        <div class="overview-card">
          <p class="ov-label">Presupuesto total</p>
          <p class="ov-value mono">{{ formatCurrency(totalBudget) }}</p>
        </div>
        <div class="overview-card red">
          <p class="ov-label">Total gastado</p>
          <p class="ov-value mono">{{ formatCurrency(totalSpent) }}</p>
        </div>
        <div class="overview-card" :class="totalAvailable >= 0 ? 'green' : 'red'">
          <p class="ov-label">Disponible</p>
          <p class="ov-value mono">{{ formatCurrency(totalAvailable) }}</p>
        </div>
        <div class="overview-card">
          <p class="ov-label">Progreso global</p>
          <div class="ov-progress">
            <div class="ov-bar">
              <div
                class="ov-fill"
                :style="{ width: `${Math.min(globalPercent, 100)}%` }"
                :class="globalPercent > 90 ? 'fill-red' : globalPercent > 70 ? 'fill-amber' : 'fill-green'"
              />
            </div>
            <span class="ov-pct">{{ globalPercent.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- Budget items -->
      <div class="budgets-grid">
        <div
          v-for="item in store.budgetProgress"
          :key="item.id"
          class="budget-item"
          :class="{ exceeded: item.exceeded }"
        >
          <div class="budget-top">
            <div class="cat-icon-lg" :style="{ background: item.category?.color + '22', color: item.category?.color }">
              {{ item.category?.icon }}
            </div>
            <div class="budget-info">
              <h3>{{ item.category?.name }}</h3>
              <p class="budget-period">{{ formatMonth(store.selectedMonth) }}</p>
            </div>
            <div class="budget-pct-badge" :class="item.exceeded ? 'badge-red' : item.percentage > 70 ? 'badge-amber' : 'badge-green'">
              {{ item.percentage.toFixed(0) }}%
            </div>
          </div>

          <div class="budget-numbers">
            <div class="num-item">
              <span>Presupuesto</span>
              <strong>{{ formatCurrency(item.amount) }}</strong>
            </div>
            <div class="num-item">
              <span>Gastado</span>
              <strong :class="item.exceeded ? 'text-red' : ''">{{ formatCurrency(item.spent) }}</strong>
            </div>
            <div class="num-item">
              <span>{{ item.exceeded ? 'Excedido' : 'Disponible' }}</span>
              <strong :class="item.exceeded ? 'text-red' : 'text-green'">
                {{ formatCurrency(Math.abs(item.amount - item.spent)) }}
              </strong>
            </div>
          </div>

          <div class="budget-bar-wrap">
            <div class="budget-bar-full">
              <div
                class="budget-bar-fill"
                :style="{
                  width: `${Math.min(item.percentage, 100)}%`,
                  background: item.exceeded ? 'var(--accent-red)' : item.category?.color || '#6b7280'
                }"
              />
            </div>
          </div>

          <div class="budget-alert" v-if="item.exceeded">
            🚨 Presupuesto superado en {{ formatCurrency(item.spent - item.amount) }}
          </div>
          <div class="budget-warning" v-else-if="item.percentage > 80">
            ⚠️ Casi al límite — te quedan {{ formatCurrency(item.amount - item.spent) }}
          </div>

          <div class="budget-actions">
            <button @click="openEdit(item)" class="btn-edit">Editar</button>
            <button @click="deleteBudget(item.id)" class="btn-delete">Eliminar</button>
          </div>
        </div>

        <div class="budget-add-card" @click="showModal = true">
          <span>+</span>
          <p>Agregar presupuesto</p>
        </div>
      </div>
    </div>
  </AppLayout>

  <!-- Modal -->
    <Teleport to="body">
      <div class="modal-backdrop" v-if="showModal" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editItem ? 'Editar presupuesto' : 'Nuevo presupuesto' }}</h2>
            <button @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label>Categoría *</label>
                <select v-model="form.categoryId">
                  <option value="">Seleccionar...</option>
                  <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">
                    {{ cat.icon }} {{ cat.name }}
                  </option>
                </select>
              </div>
              <div class="form-group full">
                <label>Monto del presupuesto *</label>
                <input v-model.number="form.amount" type="number" placeholder="0" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">Cancelar</button>
            <button class="btn-save" @click="save" :disabled="!form.categoryId || !form.amount">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatMonth } from '@/utils/formatters'

const store = useFinanceStore()
const showModal = ref(false)
const editItem = ref<any>(null)

const expenseCategories = computed(() =>
  store.categories.filter(c => c.type === 'expense' || c.type === 'both')
)

const totalBudget = computed(() => store.budgetProgress.reduce((s, b) => s + b.amount, 0))
const totalSpent = computed(() => store.budgetProgress.reduce((s, b) => s + b.spent, 0))
const totalAvailable = computed(() => totalBudget.value - totalSpent.value)
const globalPercent = computed(() => totalBudget.value > 0 ? (totalSpent.value / totalBudget.value) * 100 : 0)

const defaultForm = () => ({ categoryId: '', amount: 0 })
const form = reactive(defaultForm())

function openEdit(item: any) {
  editItem.value = item
  form.categoryId = item.categoryId
  form.amount = item.amount
  showModal.value = true
}

function closeModal() {
  showModal.value = false; editItem.value = null
  Object.assign(form, defaultForm())
}

function save() {
  store.saveBudget({
    categoryId: form.categoryId,
    amount: form.amount,
    month: store.selectedMonth,
    spent: editItem.value?.spent || 0
  })
  closeModal()
}

function deleteBudget(id: string) {
  const idx = store.budgets.findIndex(b => b.id === id)
  if (idx !== -1) store.budgets.splice(idx, 1)
}
</script>

<style scoped>
.budgets-page { display: flex; flex-direction: column; gap: 20px; }

.page-header { display: flex; justify-content: space-between; align-items: center; }
.subtitle { font-size: 13px; color: var(--text-muted); }

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px; padding: 10px 20px;
  color: #000; font-weight: 600; font-size: 13px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.budget-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.overview-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}

.overview-card.green { border-top: 3px solid var(--accent-green); }
.overview-card.red { border-top: 3px solid var(--accent-red); }

.ov-label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.ov-value { font-size: 20px; font-weight: 600; color: var(--text-primary); }

.ov-progress { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ov-bar { flex: 1; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
.ov-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.fill-green { background: var(--accent-green); }
.fill-amber { background: var(--accent-amber); }
.fill-red { background: var(--accent-red); }
.ov-pct { font-size: 12px; font-weight: 600; color: var(--text-primary); }

.budgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.budget-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.3s;
}

.budget-item:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.budget-item.exceeded { border-color: rgba(255, 71, 87, 0.2); }

.budget-top { display: flex; align-items: center; gap: 12px; }

.cat-icon-lg {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}

.budget-info { flex: 1; }
.budget-info h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.budget-period { font-size: 11px; color: var(--text-muted); margin-top: 2px; text-transform: capitalize; }

.budget-pct-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
}

.badge-green { background: var(--accent-green-dim); color: var(--accent-green); }
.badge-amber { background: var(--accent-amber-dim); color: var(--accent-amber); }
.badge-red { background: var(--accent-red-dim); color: var(--accent-red); }

.budget-numbers {
  display: flex;
  justify-content: space-between;
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 12px;
}

.num-item { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.num-item span { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
.num-item strong { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary); }

.budget-bar-wrap {}
.budget-bar-full {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}

.budget-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.budget-alert {
  background: var(--accent-red-dim);
  border: 1px solid rgba(255, 71, 87, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--accent-red);
}

.budget-warning {
  background: var(--accent-amber-dim);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--accent-amber);
}

.budget-actions { display: flex; gap: 8px; }

.btn-edit {
  flex: 1; padding: 7px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px; font-size: 12px;
  cursor: pointer; color: var(--text-secondary);
  transition: all 0.2s; font-family: 'DM Sans', sans-serif;
}

.btn-edit:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

.btn-delete {
  padding: 7px 14px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px; font-size: 12px;
  cursor: pointer; color: var(--text-muted);
  transition: all 0.2s; font-family: 'DM Sans', sans-serif;
}

.btn-delete:hover { border-color: var(--accent-red); color: var(--accent-red); }

.budget-add-card {
  background: var(--bg-card);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  transition: all 0.2s;
}

.budget-add-card span { font-size: 28px; opacity: 0.5; }

.budget-add-card:hover {
  border-color: var(--accent-green);
  color: var(--accent-green);
  background: rgba(0, 214, 143, 0.04);
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%; max-width: 420px;
  animation: fadeInUp 0.3s ease;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex; justify-content: space-between; align-items: center;
}

.modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.modal-header button {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 8px; width: 32px; height: 32px;
  cursor: pointer; color: var(--text-secondary); font-size: 14px;
}

.modal-body { padding: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }

.form-group label {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;
}

.form-group input, .form-group select {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 12px;
  color: var(--text-primary); font-size: 14px;
  font-family: 'DM Sans', sans-serif; width: 100%;
}

.form-group input:focus, .form-group select:focus {
  outline: none; border-color: var(--accent-green);
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex; gap: 10px; justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 20px; background: var(--bg-elevated);
  border: 1px solid var(--border); border-radius: 10px;
  color: var(--text-secondary); font-size: 14px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px;
  color: #000; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

.text-red { color: var(--accent-red) !important; }
.text-green { color: var(--accent-green) !important; }
.mono { font-family: 'JetBrains Mono', monospace; }
option { background: var(--bg-elevated); }
</style>
