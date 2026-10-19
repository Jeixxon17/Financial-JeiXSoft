<template>
  <AppLayout>
    <div class="inbox-page">
      <!-- Estado de la lectura de notificaciones -->
      <div v-if="canReadNotifications" class="status-card" :class="permission ? 'ok' : 'warn'">
        <div>
          <strong>{{ permission ? '🔔 Leyendo notificaciones de Bancolombia' : '🔕 Lectura de notificaciones desactivada' }}</strong>
          <p v-if="permission">Cada notificación de Bancolombia llega aquí para que la confirmes.</p>
          <p v-else>
            Toca "Activar", busca <b>JeiXSoft</b> en "Acceso a notificaciones" y actívalo.
            Luego vuelve a la app.
          </p>
        </div>
        <button v-if="!permission" class="btn-primary" @click="activate">Activar</button>
      </div>

      <div v-else class="status-card info">
        <div>
          <strong>📱 Las notificaciones se leen desde la app Android</strong>
          <p>Lo que llegue al celular aparece aquí también, para confirmarlo desde cualquier lado.</p>
        </div>
      </div>

      <!-- Lista -->
      <div v-if="store.pendingTransactions.length" class="pending-list">
        <div v-for="item in store.pendingTransactions" :key="item.id" class="pending-card">
          <div class="pending-top">
            <span class="type-badge" :class="item.type || 'unknown'">
              {{ item.type === 'income' ? '📥 Ingreso' : item.type === 'expense' ? '📤 Gasto' : '❔ Sin identificar' }}
            </span>
            <span class="pending-date">{{ formatReceived(item.receivedAt) }}</span>
          </div>

          <div class="pending-main">
            <div class="pending-info">
              <p class="pending-desc">{{ item.description || item.title || 'Movimiento' }}</p>
              <p class="pending-account">
                {{ accountLabel(item) }}
              </p>
            </div>
            <strong class="pending-amount" :class="item.type || ''">
              {{ item.amount !== null ? formatCurrency(item.amount) : '—' }}
            </strong>
          </div>

          <p v-if="item.type === 'expense' && item.productKind === 'credit'" class="pending-hint">
            💳 Compra con tarjeta de crédito: al registrarla eliges en cuántas cuotas la diferiste.
          </p>

          <p class="pending-text">{{ item.title }} · {{ item.text }}</p>

          <div class="pending-actions">
            <button class="btn-ghost" @click="store.dismissPendingTransaction(item.id)">Descartar</button>
            <button class="btn-primary" @click="selected = item">Registrar</button>
          </div>
        </div>
      </div>

      <div v-else class="empty">
        <span>📭</span>
        <p>No hay movimientos por confirmar</p>
      </div>
    </div>
  </AppLayout>

  <TransactionModal
    v-if="selected"
    :key="selected.id"
    title="Confirmar movimiento"
    :prefill="prefillFor(selected)"
    @saved="store.dismissPendingTransaction(selected!.id)"
    @close="selected = null"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import TransactionModal from '@/components/modals/TransactionModal.vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'
import { toISODate } from '@/utils/dates'
import type { PendingTransaction, Transaction } from '@/interfaces'
import {
  canReadNotifications,
  notificationPermissionGranted,
  requestNotificationPermission
} from '@/services/notificationListener'

const store = useFinanceStore()
const selected = ref<PendingTransaction | null>(null)
const permission = ref(false)

async function refreshPermission() {
  permission.value = await notificationPermissionGranted()
}

async function activate() {
  await requestNotificationPermission()
}

// Al volver de Ajustes se revisa otra vez el permiso
function onVisible() {
  if (!document.hidden) {
    refreshPermission()
    store.loadPendingTransactions()
  }
}

onMounted(() => {
  refreshPermission()
  store.loadPendingTransactions()
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

function accountLabel(item: PendingTransaction) {
  const account = store.getAccountForNotification(item.last4, item.productKind)
  if (account) return `${account.icon} ${account.name}${item.last4 ? ` · *${item.last4}` : ''}`
  return item.last4 ? `Cuenta *${item.last4} (sin asociar)` : 'Cuenta sin identificar'
}

function formatReceived(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function prefillFor(item: PendingTransaction): Partial<Transaction> {
  const category = item.suggestedCategory && store.getCategoryById(item.suggestedCategory)
    ? item.suggestedCategory
    : ''

  return {
    type: item.type || 'expense',
    amount: item.amount || 0,
    date: item.date || toISODate(new Date(item.receivedAt)),
    accountId: store.getAccountForNotification(item.last4, item.productKind)?.id || '',
    description: item.description,
    category
  }
}
</script>

<style scoped>
.inbox-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.status-card strong {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.status-card p {
  font-size: 13px;
  color: var(--text-secondary);
}

.status-card.ok { border-left: 4px solid var(--accent-green); }
.status-card.warn { border-left: 4px solid var(--accent-amber); }
.status-card.info { border-left: 4px solid var(--accent-blue); }

.pending-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 12px;
}

.pending-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.pending-top,
.pending-main,
.pending-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.type-badge.income { background: var(--accent-green-dim); color: var(--accent-green); }
.type-badge.expense { background: var(--accent-red-dim); color: var(--accent-red); }

.pending-date {
  font-size: 11px;
  color: var(--text-muted);
}

.pending-info { min-width: 0; }

.pending-desc,
.pending-account {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-desc {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.pending-account {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.pending-amount {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  color: var(--text-primary);
}

.pending-amount.income { color: var(--accent-green); }
.pending-amount.expense { color: var(--accent-red); }

.pending-hint {
  font-size: 12px;
  color: var(--accent-blue);
}

.pending-text {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
}

.pending-actions {
  justify-content: flex-end;
}

.btn-primary,
.btn-ghost {
  flex-shrink: 0;
  border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  border: none;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  color: #000;
}

.btn-ghost {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
}

.empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-muted);
}

.empty span {
  display: block;
  font-size: 36px;
  opacity: 0.5;
  margin-bottom: 8px;
}

@media (max-width: 480px) {
  .status-card {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
