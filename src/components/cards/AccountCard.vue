<template>
  <div class="account-card" :style="{ '--acc-color': account.color }">
    <div class="acc-header">
      <div class="acc-icon">{{ account.icon }}</div>
      <div class="acc-meta">
        <h3>{{ account.name }}</h3>
        <span class="acc-type">{{ typeLabel }}</span>
      </div>
      <div class="acc-actions">
        <button @click="$emit('edit', account)" class="action-btn">✏️</button>
        <button @click="$emit('delete', account.id)" class="action-btn danger">🗑️</button>
      </div>
    </div>

    <!-- Credit card special display -->
    <template v-if="account.type === 'credit'">
      <!-- Statement (like the bank app) -->
      <div class="statement" v-if="statement?.lastCutoff">
        <div class="statement-main">
          <div>
            <span class="balance-label">Pago mínimo</span>
            <span class="balance-amount" :class="statement.isMinimumCovered ? 'text-green' : ''">
              {{ formatCurrency(statement.minimumPayment) }}
            </span>
          </div>
          <span class="due-chip" :class="dueClass">{{ dueText }}</span>
        </div>

        <div class="statement-row">
          <div>
            <span>Pago total</span>
            <strong>{{ formatCurrency(calculatedData.usedCredit || 0) }}</strong>
          </div>
          <div>
            <span>Fecha límite</span>
            <strong>{{ statement.dueDate ? shortDate(statement.dueDate) : '—' }}</strong>
          </div>
        </div>

        <div class="statement-next" v-if="statement.nextCutoff">
          <span>Mínimo al corte del {{ shortDate(statement.nextCutoff) }}</span>
          <strong>{{ formatCurrency(statement.nextMinimumPayment) }}</strong>
        </div>
      </div>

      <div class="credit-balance">
        <span class="balance-label">Cupo disponible</span>
        <span class="balance-amount available">{{ formatCurrency(available) }}</span>
      </div>
      <div class="credit-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${usedPercent}%` }"
            :class="usedPercent > 80 ? 'fill-danger' : usedPercent > 50 ? 'fill-warning' : 'fill-safe'"
          />
        </div>
        <div class="progress-labels">
          <span>{{ formatCurrency(calculatedData.usedCredit || 0) }} usado</span>
          <span class="used-pct" :class="usedPercent > 80 ? 'text-red' : usedPercent > 50 ? 'text-amber' : 'text-green'">
            {{ usedPercent.toFixed(0) }}%
          </span>
        </div>
      </div>
      <div class="credit-details">
        <div class="detail-item">
          <span>Cupo total</span>
          <span>{{ formatCurrency(account.creditLimit || 0) }}</span>
        </div>
        <div class="detail-item" v-if="statement?.lastCutoff">
          <span>Último corte</span>
          <span>{{ shortDate(statement.lastCutoff) }}</span>
        </div>
        <div class="detail-item" v-if="statement?.nextCutoff">
          <span>Próximo corte</span>
          <span>{{ shortDate(statement.nextCutoff) }}</span>
        </div>
        <div class="detail-item" v-if="!account.cutoffDate">
          <span>Fecha corte</span>
          <span class="text-amber">Configúrala para ver el pago mínimo</span>
        </div>
      </div>
      <div class="credit-alert" v-if="usedPercent > 70">
        ⚠️ {{ usedPercent > 90 ? 'Cupo casi agotado' : 'Alto uso de cupo' }}
      </div>
    </template>

    <!-- Regular account display -->
    <template v-else>
      <div class="balance-section">
        <span class="balance-label">Saldo disponible</span>
        <span class="balance-amount" :class="calculatedData.balance < 0 ? 'text-red' : ''">
          {{ formatCurrency(calculatedData.balance || 0) }}
        </span>
      </div>
    </template>

    <div class="acc-gradient" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Account } from '@/interfaces'
import { formatCurrency } from '@/utils/formatters'
import { useFinanceStore } from '@/stores/finance'

const props = defineProps<{ account: Account }>()
defineEmits(['edit', 'delete'])

const typeLabels: Record<string, string> = {
  debit: 'Débito',
  credit: 'Crédito',
  savings: 'Ahorros',
  cash: 'Efectivo'
}
const store = useFinanceStore()
const typeLabel = computed(() => typeLabels[props.account.type] || '')
const available = computed(() =>
  calculatedData.value.availableCredit
)
const usedPercent = computed(() => {

  if (!props.account.creditLimit) return 0

  return (
    (calculatedData.value.usedCredit / props.account.creditLimit) * 100
  )
})

const calculatedData = computed(() => {
  return store.calculateAccountBalance(props.account.id)
})

const statement = computed(() => store.getCreditStatement(props.account.id))

function shortDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

const dueText = computed(() => {
  const s = statement.value
  if (!s || s.daysToDue === null) return ''
  if (s.isMinimumCovered) return '✓ Al día'
  if (s.daysToDue < 0) return `Vencido hace ${-s.daysToDue} ${s.daysToDue === -1 ? 'día' : 'días'}`
  if (s.daysToDue === 0) return 'Vence hoy'
  return `Faltan ${s.daysToDue} ${s.daysToDue === 1 ? 'día' : 'días'}`
})

const dueClass = computed(() => {
  const s = statement.value
  if (!s || s.isMinimumCovered) return 'due-ok'
  if (s.daysToDue !== null && s.daysToDue <= 3) return 'due-danger'
  return 'due-warning'
})
</script>

<style scoped>
.statement-next {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-muted);
}

.statement-next strong {
  font-size: 14px;
  color: var(--text-primary);
}

.account-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border-top: 3px solid var(--acc-color, var(--accent-blue));
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
}

.acc-gradient {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--acc-color, var(--accent-blue)) 0%, transparent 70%);
  opacity: 0.04;
  pointer-events: none;
  border-radius: 50%;
  transform: translate(30px, -30px);
}

.acc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.acc-icon {
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.acc-meta {
  flex: 1;
  min-width: 0;
}

.acc-meta h3 {
  font-family: 'Syne', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.acc-type {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.acc-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.account-card:hover .acc-actions { opacity: 1; }

/* En pantallas táctiles no hay hover: las acciones siempre visibles */
@media (hover: none) {
  .acc-actions { opacity: 1; }
}

.action-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover { border-color: var(--accent-blue); }
.action-btn.danger:hover { border-color: var(--accent-red); }

.balance-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.balance-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.balance-amount.available {
  color: var(--accent-green);
}

.statement {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.statement-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.statement-main > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.due-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.due-ok { background: var(--accent-green-dim); color: var(--accent-green); }
.due-warning { background: var(--accent-amber-dim); color: var(--accent-amber); }
.due-danger { background: var(--accent-red-dim); color: var(--accent-red); }

.statement-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.statement-row > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.statement-row span {
  font-size: 11px;
  color: var(--text-muted);
}

.statement-row strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

.credit-balance {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.credit-progress {
  margin-bottom: 14px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s ease;
}

.fill-safe { background: var(--accent-green); }
.fill-warning { background: var(--accent-amber); }
.fill-danger { background: var(--accent-red); }

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

.used-pct { font-weight: 600; }

.credit-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
}

.detail-item.highlight {
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 4px;
  color: var(--text-primary);
  font-weight: 500;
}

.credit-alert {
  margin-top: 10px;
  background: var(--accent-red-dim);
  border: 1px solid rgba(255, 71, 87, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--accent-red);
}

.text-red { color: var(--accent-red) !important; }
.text-amber { color: var(--accent-amber) !important; }
.text-green { color: var(--accent-green) !important; }
</style>
