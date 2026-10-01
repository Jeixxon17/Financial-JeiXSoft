<template>
  <AppLayout>
    <div class="recurring-page">
      <div class="page-header">
        <div>
          <p class="header-subtitle">Membresías y cobros que se registran solos cada mes</p>
        </div>
        <button class="btn-add" @click="openNew">+ Nuevo gasto automático</button>
      </div>

      <!-- Summary -->
      <div class="rec-summary">
        <div class="sum-chip">
          <span>🔁 Total mensual</span>
          <strong class="text-red">{{ formatCurrency(store.recurringMonthlyTotal) }}</strong>
        </div>
        <div class="sum-chip">
          <span>✅ Activos</span>
          <strong>{{ activeCount }} de {{ store.recurringExpenses.length }}</strong>
        </div>
        <div class="sum-chip" v-if="nextCharge">
          <span>📅 Próximo cobro</span>
          <strong class="text-amber">{{ nextCharge.rec.name }} · {{ formatDate(nextCharge.date) }}</strong>
        </div>
      </div>

      <!-- List -->
      <div class="rec-list">
        <div
          v-for="rec in sortedRecurring"
          :key="rec.id"
          class="rec-card"
          :class="{ inactive: !rec.active }"
        >
          <div class="rec-icon">{{ rec.icon }}</div>

          <div class="rec-info">
            <h3>{{ rec.name }}</h3>
            <p class="rec-meta">
              Día {{ rec.dayOfMonth }} de cada mes · {{ getAccName(rec.accountId) }}
            </p>
            <p class="rec-meta" v-if="rec.active">
              Próximo cobro: {{ formatDate(store.nextRecurringDate(rec)) }}
            </p>
            <p class="rec-meta" v-else>Pausado</p>
          </div>

          <div class="rec-amount">-{{ formatCurrency(rec.amount) }}</div>

          <div class="rec-actions">
            <button
              class="toggle"
              :class="{ on: rec.active }"
              :title="rec.active ? 'Pausar' : 'Activar'"
              @click="toggleActive(rec)"
            >
              <span />
            </button>
            <button class="icon-btn" @click="openEdit(rec)">✏️</button>
            <button class="icon-btn danger" @click="remove(rec)">🗑️</button>
          </div>
        </div>

        <div v-if="!store.recurringExpenses.length" class="empty">
          <span>🔁</span>
          <p>Aún no tienes gastos automáticos</p>
          <small>Agrega tus membresías (Netflix, PlayStation Plus...) y se registrarán solas el día del cobro.</small>
        </div>
      </div>
    </div>
  </AppLayout>

  <!-- Modal -->
  <Teleport to="body" v-if="showModal">
    <div class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar gasto automático' : 'Nuevo gasto automático' }}</h2>
          <button @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nombre *</label>
              <input v-model="form.name" type="text" placeholder="Ej: PlayStation Plus" />
            </div>

            <div class="form-group">
              <label>Monto *</label>
              <input v-model.number="form.amount" type="number" min="0" step="1000" placeholder="0" />
            </div>

            <div class="form-group">
              <label>Día del cobro *</label>
              <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" />
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

            <div class="form-group">
              <label>Categoría *</label>
              <CategorySelect v-model="form.category" type="expense" />
            </div>

            <div class="form-group full">
              <label>Primer cobro desde</label>
              <input v-model="form.startDate" type="date" />
              <small class="hint">
                Se registran los cobros desde esta fecha. Si pones una fecha pasada, se agregan los cobros que ya ocurrieron.
              </small>
            </div>

            <div class="form-group full">
              <label>Icono</label>
              <div class="icon-picker">
                <button
                  v-for="icon in icons"
                  :key="icon"
                  type="button"
                  class="icon-opt"
                  :class="{ selected: form.icon === icon }"
                  @click="form.icon = icon"
                >{{ icon }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button class="btn-save" @click="save" :disabled="!isValid || isSaving">
            {{ isSaving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import CategorySelect from '@/components/CategorySelect.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { addDaysISO, todayISO } from '@/utils/dates'
import type { RecurringExpense } from '@/interfaces'

const store = useFinanceStore()

onMounted(async () => {
  await Promise.all([store.loadAccounts(), store.loadRecurringExpenses()])
})

const icons = ['🎮', '🎬', '🎵', '📺', '☁️', '📱', '🏋️', '📰', '🛡️', '💡', '🌐', '🔁']

const showModal = ref(false)
const isSaving = ref(false)
const editing = ref<RecurringExpense | null>(null)

const defaultForm = () => ({
  name: '',
  amount: 0,
  dayOfMonth: new Date().getDate(),
  accountId: '',
  category: '',
  icon: '🎮',
  startDate: todayISO()
})

const form = reactive(defaultForm())

const activeCount = computed(() => store.recurringExpenses.filter(r => r.active).length)

const sortedRecurring = computed(() =>
  [...store.recurringExpenses].sort((a, b) =>
    Number(b.active) - Number(a.active) || a.dayOfMonth - b.dayOfMonth
  )
)

const nextCharge = computed(() => {
  const upcoming = store.recurringExpenses
    .filter(r => r.active)
    .map(rec => ({ rec, date: store.nextRecurringDate(rec) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return upcoming[0]
})

const isValid = computed(() =>
  form.name.trim() &&
  form.amount > 0 &&
  Number.isInteger(form.dayOfMonth) &&
  form.dayOfMonth >= 1 &&
  form.dayOfMonth <= 31 &&
  form.accountId &&
  form.category &&
  form.startDate
)

function getAccName(id: string) {
  return store.getAccountById(id)?.name || 'Sin cuenta'
}

function openNew() {
  editing.value = null
  Object.assign(form, defaultForm())
  showModal.value = true
}

function openEdit(rec: RecurringExpense) {
  editing.value = rec
  Object.assign(form, {
    name: rec.name,
    amount: rec.amount,
    dayOfMonth: rec.dayOfMonth,
    accountId: rec.accountId,
    category: rec.category,
    icon: rec.icon,
    startDate: rec.startDate
  })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function save() {
  if (!isValid.value || isSaving.value) return
  isSaving.value = true

  try {
    const data = { ...form, name: form.name.trim() }

    if (editing.value) {
      const updates: Partial<RecurringExpense> = { ...data }

      // Si cambia la fecha de inicio, se vuelve a revisar desde esa fecha
      if (data.startDate !== editing.value.startDate) {
        updates.lastRunDate = addDaysISO(data.startDate, -1)
      }

      await store.updateRecurringExpense(editing.value.id, updates)
    } else {
      await store.addRecurringExpense({ ...data, active: true })
    }

    closeModal()
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(rec: RecurringExpense) {
  const updates: Partial<RecurringExpense> = { active: !rec.active }

  // Al reactivar no se cobran los meses que estuvo pausado
  if (!rec.active) {
    updates.lastRunDate = addDaysISO(todayISO(), -1)
  }

  await store.updateRecurringExpense(rec.id, updates)
}

async function remove(rec: RecurringExpense) {
  if (!confirm(`¿Eliminar "${rec.name}"? Los movimientos ya registrados se conservan.`)) return
  await store.deleteRecurringExpense(rec.id)
}
</script>

<style scoped>
.recurring-page { display: flex; flex-direction: column; gap: 20px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  color: #000;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 4px 12px rgba(0,214,143,0.25);
}

.rec-summary { display: flex; gap: 12px; flex-wrap: wrap; }

.sum-chip {
  flex: 1;
  min-width: 150px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum-chip span { font-size: 11px; color: var(--text-muted); }
.sum-chip strong { font-family: 'JetBrains Mono', monospace; font-size: 16px; color: var(--text-primary); }

.text-red { color: var(--accent-red) !important; }
.text-amber { color: var(--accent-amber) !important; }

.rec-list { display: flex; flex-direction: column; gap: 10px; }

.rec-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  transition: all 0.2s;
}

.rec-card:hover { border-color: var(--border-light); }
.rec-card.inactive { opacity: 0.55; }

.rec-icon {
  font-size: 22px;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.rec-info { flex: 1; min-width: 0; }
.rec-info h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.rec-meta { font-size: 12px; color: var(--text-muted); }

.rec-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-red);
  white-space: nowrap;
}

.rec-actions { display: flex; align-items: center; gap: 6px; }

.toggle {
  width: 38px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all 0.2s;
}

.toggle.on { background: var(--accent-green-dim); border-color: var(--accent-green); }
.toggle.on span { left: 18px; background: var(--accent-green); }

.icon-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover { border-color: var(--accent-blue); }
.icon-btn.danger:hover { border-color: var(--accent-red); }

.empty {
  background: var(--bg-card);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.empty span { font-size: 32px; opacity: 0.5; }
.empty p { font-size: 14px; color: var(--text-secondary); }
.empty small { font-size: 12px; max-width: 360px; }

@media (max-width: 600px) {
  .rec-card { flex-wrap: wrap; }
  .rec-info { flex-basis: calc(100% - 58px); }
  .rec-amount { margin-left: 58px; }
  .rec-actions { margin-left: auto; }
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: fadeInUp 0.3s ease;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.modal-header button {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 32px; height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
}

.modal-body { padding: 24px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }

.form-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.form-group input, .form-group select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
}

.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-green); }

.hint { font-size: 11px; color: var(--text-muted); }

.icon-picker { display: flex; flex-wrap: wrap; gap: 6px; }

.icon-opt {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-opt.selected, .icon-opt:hover { border-color: var(--accent-green); background: var(--accent-green-dim); }

.modal-footer { padding: 0 24px 24px; display: flex; gap: 10px; justify-content: flex-end; }

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

option { background: var(--bg-elevated); }
</style>
