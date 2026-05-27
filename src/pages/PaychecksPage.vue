<template>
  <AppLayout>
    <div class="paychecks-page">
      <div class="page-header">
        <p class="subtitle">Control de quincenas e ingresos</p>
        <button class="btn-add" @click="showModal = true">+ Nueva quincena</button>
      </div>

      <!-- Summary -->
      <div class="pay-summary">
        <div class="sum-card green">
          <span class="sum-icon">💰</span>
          <p class="sum-label">Total recibido</p>
          <p class="sum-value mono">{{ formatCurrency(totalReceived) }}</p>
        </div>
        <div class="sum-card red">
          <span class="sum-icon">📤</span>
          <p class="sum-label">Total gastado</p>
          <p class="sum-value mono">{{ formatCurrency(totalSpent) }}</p>
        </div>
        <div class="sum-card" :class="totalRemaining >= 0 ? 'blue' : 'red'">
          <span class="sum-icon">💵</span>
          <p class="sum-label">Dinero restante</p>
          <p class="sum-value mono">{{ formatCurrency(totalRemaining) }}</p>
        </div>
      </div>

      <!-- Paychecks list -->
      <div class="pays-grid">
        <div v-for="pay in monthPaychecks" :key="pay.id" class="pay-card" :class="`status-${pay.status}`">
          <div class="pay-top">
            <div class="pay-icon">
              {{ pay.status === 'received' ? '✅' : pay.status === 'pending' ? '⏳' : '🔶' }}
            </div>
            <div class="pay-meta">
              <h3>{{ pay.label }}</h3>
              <p class="pay-date">{{ formatDate(pay.date) }}</p>
            </div>
            <div class="pay-actions">
              <button @click="editPay = pay; showModal = true" class="icon-btn">✏️</button>
              <button @click="store.deletePaycheck(pay.id)" class="icon-btn danger">🗑️</button>
            </div>
          </div>

          <div class="pay-amount">
            <span class="amount-label">Monto recibido</span>
            <span class="amount-value mono green">{{ formatCurrency(pay.amount) }}</span>
          </div>

          <div class="pay-progress">
            <div class="prog-labels">
              <span>Gastado: {{ formatCurrency(pay.spent) }}</span>
              <span>{{ spentPercent(pay).toFixed(0) }}%</span>
            </div>
            <div class="prog-bar">
              <div
                class="prog-fill"
                :style="{ width: `${Math.min(spentPercent(pay), 100)}%` }"
                :class="spentPercent(pay) > 90 ? 'fill-red' : spentPercent(pay) > 60 ? 'fill-amber' : 'fill-green'"
              />
            </div>
            <p class="remaining-text">
              Disponible: <strong class="green">{{ formatCurrency(pay.amount - pay.spent) }}</strong>
            </p>
          </div>

          <div class="pay-desc" v-if="pay.description">
            <span>📝 {{ pay.description }}</span>
          </div>

          <div class="pay-status-badge">
            <span class="status-dot" :class="`dot-${pay.status}`" />
            {{ statusLabels[pay.status] }}
          </div>
        </div>

        <div class="pay-empty" v-if="!monthPaychecks.length">
          <span>💸</span>
          <p>No hay quincenas registradas este mes</p>
          <button class="btn-add-sm" @click="showModal = true">Registrar primera quincena</button>
        </div>
      </div>
    </div>
  </AppLayout>

  <!-- Modal -->
    <Teleport to="body">
      <div class="modal-backdrop" v-if="showModal" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editPay ? 'Editar quincena' : 'Nueva quincena' }}</h2>
            <button @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label>Etiqueta *</label>
                <input v-model="form.label" type="text" placeholder="Ej: Primera quincena mayo" />
              </div>
              <div class="form-group">
                <label>Monto *</label>
                <input v-model.number="form.amount" type="number" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Fecha</label>
                <input v-model="form.date" type="date" />
              </div>
              <div class="form-group">
                <label>Estado</label>
                <select v-model="form.status">
                  <option value="received">Recibido</option>
                  <option value="pending">Pendiente</option>
                  <option value="partial">Parcial</option>
                </select>
              </div>
              <div class="form-group">
                <label>Gastado hasta ahora</label>
                <input v-model.number="form.spent" type="number" placeholder="0" />
              </div>
              <div class="form-group full">
                <label>Descripción</label>
                <input v-model="form.description" type="text" placeholder="Notas..." />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">Cancelar</button>
            <button class="btn-save" @click="save" :disabled="!form.label || !form.amount">Guardar</button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatDate, getMonthRange } from '@/utils/formatters'
import type { Paycheck } from '@/interfaces'

const store = useFinanceStore()
const showModal = ref(false)
const editPay = ref<Paycheck | null>(null)

const statusLabels: Record<string, string> = {
  received: 'Recibido', pending: 'Pendiente', partial: 'Parcial'
}

const monthPaychecks = computed(() => {
  const { start, end } = getMonthRange(store.selectedMonth)
  return store.paychecks.filter(p => p.date >= start && p.date <= end)
})

const totalReceived = computed(() => monthPaychecks.value.reduce((s, p) => s + p.amount, 0))
const totalSpent = computed(() => monthPaychecks.value.reduce((s, p) => s + p.spent, 0))
const totalRemaining = computed(() => totalReceived.value - totalSpent.value)

function spentPercent(pay: Paycheck) {
  return pay.amount > 0 ? (pay.spent / pay.amount) * 100 : 0
}

const defaultForm = () => ({
  label: '', amount: 0, date: new Date().toISOString().split('T')[0],
  description: '', status: 'received' as Paycheck['status'], spent: 0
})
const form = reactive(defaultForm())

watch(editPay, (p) => { if (p) Object.assign(form, p) })

function closeModal() {
  showModal.value = false; editPay.value = null
  Object.assign(form, defaultForm())
}

function save() {
  if (editPay.value) {
    store.updatePaycheck(editPay.value.id, { ...form })
  } else {
    store.addPaycheck({ ...form })
  }
  closeModal()
}
</script>

<style scoped>
.paychecks-page { display: flex; flex-direction: column; gap: 20px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subtitle { font-size: 13px; color: var(--text-muted); }

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px;
  padding: 10px 20px; color: #000;
  font-weight: 600; font-size: 13px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.pay-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.sum-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum-card.green { border-top: 3px solid var(--accent-green); }
.sum-card.red { border-top: 3px solid var(--accent-red); }
.sum-card.blue { border-top: 3px solid var(--accent-blue); }

.sum-icon { font-size: 22px; }
.sum-label { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.sum-value { font-size: 20px; font-weight: 600; color: var(--text-primary); }

.pays-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.pay-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.3s ease;
}

.pay-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.pay-card.status-received { border-left: 3px solid var(--accent-green); }
.pay-card.status-pending { border-left: 3px solid var(--accent-amber); }
.pay-card.status-partial { border-left: 3px solid var(--accent-blue); }

.pay-top { display: flex; align-items: center; gap: 12px; }

.pay-icon {
  width: 40px; height: 40px;
  background: var(--bg-elevated);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

.pay-meta { flex: 1; }
.pay-meta h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.pay-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.pay-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.pay-card:hover .pay-actions { opacity: 1; }

.icon-btn {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 8px;
  font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.icon-btn.danger:hover { border-color: var(--accent-red); }

.pay-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 12px 14px;
}

.amount-label { font-size: 12px; color: var(--text-muted); }
.amount-value { font-size: 20px; font-weight: 600; }

.pay-progress { display: flex; flex-direction: column; gap: 6px; }

.prog-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.prog-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.fill-green { background: var(--accent-green); }
.fill-amber { background: var(--accent-amber); }
.fill-red { background: var(--accent-red); }

.remaining-text { font-size: 12px; color: var(--text-muted); }

.pay-desc {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 8px 10px;
}

.pay-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
}
.dot-received { background: var(--accent-green); }
.dot-pending { background: var(--accent-amber); }
.dot-partial { background: var(--accent-blue); }

.pay-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px;
  background: var(--bg-card);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  color: var(--text-muted);
}

.pay-empty span { font-size: 40px; opacity: 0.4; }
.pay-empty p { font-size: 14px; }

.btn-add-sm {
  background: var(--accent-green-dim);
  border: 1px solid rgba(0,214,143,0.3);
  color: var(--accent-green);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

/* Modal reuse */
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
  width: 100%; max-width: 480px;
  max-height: 90vh; overflow-y: auto;
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
  cursor: pointer; color: var(--text-secondary); font-size: 14px;
}

.modal-body { padding: 24px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
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
  color: var(--text-secondary); font-size: 14px; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none; border-radius: 10px;
  color: #000; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
}

.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.green { color: var(--accent-green); }
.mono { font-family: 'JetBrains Mono', monospace; }
option { background: var(--bg-elevated); }
</style>
