<template>
  <AppLayout>
    <div class="accounts-page">
      <div class="page-header">
        <div>
          <p class="header-subtitle">Gestiona tus cuentas bancarias y tarjetas</p>
        </div>
        <button class="btn-add" @click="showModal = true">+ Nueva cuenta</button>
      </div>

      <!-- Summary -->
      <div class="acc-summary">
        <div class="sum-chip">
          <span>💰 Activos totales</span>
          <strong class="text-green">{{ formatCurrency(totalAssets) }}</strong>
        </div>
        <div class="sum-chip">
          <span>💳 Deuda total</span>
          <strong class="text-red">{{ formatCurrency(store.totalDebt) }}</strong>
        </div>
        <div class="sum-chip">
          <span>🏦 Cupo disponible</span>
          <strong class="text-purple">{{ formatCurrency(store.availableCredit) }}</strong>
        </div>
      </div>

      <!-- Accounts grid -->
      <div class="accounts-grid">
        <AccountCard
          v-for="acc in store.accounts"
          :key="acc.id"
          :account="acc"
          @edit="editAccount = $event; showModal = true"
          @delete="store.deleteAccount($event)"
        />
        <div class="add-account-card" @click="showModal = true">
          <span class="add-icon">+</span>
          <p>Agregar cuenta</p>
        </div>
      </div>
    </div>

    <!-- Account modal -->
    <Teleport to="body">
      <div class="modal-backdrop" v-if="showModal" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editAccount ? 'Editar cuenta' : 'Nueva cuenta' }}</h2>
            <button @click="closeModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label>Nombre *</label>
                <input v-model="form.name" type="text" placeholder="Ej: Bancolombia" />
              </div>
              <div class="form-group">
                <label>Tipo *</label>
                <select v-model="form.type">
                  <option value="debit">Débito</option>
                  <option value="credit">Crédito</option>
                  <option value="savings">Ahorro</option>
                  <option value="cash">Efectivo</option>
                </select>
              </div>
              <div class="form-group">
                <label>Icono</label>
                <div class="icon-picker">
                  <button
                    v-for="icon in icons"
                    :key="icon"
                    class="icon-opt"
                    :class="{ selected: form.icon === icon }"
                    @click="form.icon = icon"
                  >{{ icon }}</button>
                </div>
              </div>
              <div class="form-group">
                <label>Color</label>
                <div class="color-picker">
                  <button
                    v-for="color in colors"
                    :key="color"
                    class="color-opt"
                    :style="{ background: color }"
                    :class="{ selected: form.color === color }"
                    @click="form.color = color"
                  />
                </div>
              </div>

              <template v-if="form.type !== 'credit'">
                <div class="form-group">
                  <label>Saldo inicial</label>
                  <input v-model.number="form.balance" type="number" placeholder="0" />
                </div>
              </template>

              <template v-if="form.type === 'credit'">
                <div class="form-group">
                  <label>Cupo total</label>
                  <input v-model.number="form.creditLimit" type="number" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>Cupo usado</label>
                  <input v-model.number="form.usedCredit" type="number" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>Fecha de corte (día)</label>
                  <input v-model.number="form.cutoffDate" type="number" min="1" max="31" placeholder="15" />
                </div>
                <div class="form-group">
                  <label>Fecha de pago (día)</label>
                  <input v-model.number="form.paymentDate" type="number" min="1" max="31" placeholder="25" />
                </div>
              </template>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">Cancelar</button>
            <button class="btn-save" @click="save" :disabled="!form.name">Guardar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AccountCard from '@/components/cards/AccountCard.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'
import type { Account } from '@/interfaces'

const store = useFinanceStore()
const showModal = ref(false)
const editAccount = ref<Account | null>(null)

const totalAssets = computed(() =>
  store.accounts.filter(a => a.type !== 'credit').reduce((s, a) => s + a.balance, 0)
)

const icons = ['🏦', '💜', '🟢', '💵', '💳', '🔵', '🟡', '🔴', '🏧', '💰', '📱', '🌐']
const colors = ['#FFD700', '#820AD1', '#00C9A7', '#6C63FF', '#4a9eff', '#ff4757', '#00d68f', '#f59e0b', '#ec4899', '#06b6d4', '#3b82f6', '#ef4444']

const defaultForm = () => ({
  name: '',
  type: 'debit' as Account['type'],
  balance: 0,
  color: '#4a9eff',
  icon: '🏦',
  creditLimit: 0,
  usedCredit: 0,
  cutoffDate: 15,
  paymentDate: 25
})

const form = reactive(defaultForm())

function closeModal() {
  showModal.value = false
  editAccount.value = null
  Object.assign(form, defaultForm())
}

function save() {
  if (!form.name) return
  if (editAccount.value) {
    store.updateAccount(editAccount.value.id, { ...form })
  } else {
    store.addAccount({ ...form })
  }
  closeModal()
}

// Populate form when editing
import { watch } from 'vue'
watch(editAccount, (acc) => {
  if (acc) Object.assign(form, acc)
})
</script>

<style scoped>
.accounts-page { display: flex; flex-direction: column; gap: 20px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

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

.acc-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

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
.sum-chip strong { font-family: 'JetBrains Mono', monospace; font-size: 18px; }

.text-green { color: var(--accent-green); }
.text-red { color: var(--accent-red); }
.text-purple { color: var(--accent-purple); }

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.add-account-card {
  background: var(--bg-card);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
  min-height: 160px;
}

.add-account-card:hover {
  border-color: var(--accent-green);
  color: var(--accent-green);
  background: rgba(0, 214, 143, 0.04);
}

.add-icon { font-size: 28px; opacity: 0.5; }
.add-account-card p { font-size: 13px; }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

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

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: var(--accent-green);
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

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

.icon-opt.selected, .icon-opt:hover {
  border-color: var(--accent-green);
  background: var(--accent-green-dim);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-opt {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-opt.selected { border-color: white; transform: scale(1.15); }
.color-opt:hover { transform: scale(1.1); }

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
