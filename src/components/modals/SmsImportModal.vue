<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!busy && $emit('close')">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Buscar SMS del banco</h2>
            <p class="subtitle">Recupera movimientos que no llegaron a "Por confirmar"</p>
          </div>
          <button class="modal-close" :disabled="busy" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Desde</label>
              <input v-model="from" type="date" :max="to" />
            </div>
            <div class="form-group">
              <label>Hasta</label>
              <input v-model="to" type="date" :min="from" :max="today" />
            </div>
          </div>

          <div class="presets">
            <button v-for="p in presets" :key="p.days" type="button" @click="setDays(p.days)">{{ p.label }}</button>
          </div>

          <p class="hint">
            Se leen los SMS de Bancolombia que siguen en tu celular. Las notificaciones de las apps (Bancolombia, NU)
            no se pueden recuperar: Android no las guarda.
          </p>

          <p v-if="error" class="error">{{ error }}</p>

          <template v-if="searched">
            <p v-if="!rows.length" class="hint">No hay SMS del banco entre esas fechas.</p>

            <div v-else class="summary">
              {{ rows.length }} SMS · {{ newCount }} sin registrar · {{ rows.length - newCount }} ya registrados o en espera
            </div>

            <label
              v-for="row in rows"
              :key="row.item.id"
              class="row"
              :class="{ off: !row.include, done: row.status !== 'new' }"
            >
              <input v-model="row.include" type="checkbox" :disabled="row.status === 'pending'" />
              <span class="row-info">
                <strong>{{ row.parsed.description || row.item.text.slice(0, 60) }}</strong>
                <small>{{ formatWhen(row.item.receivedAt) }} · {{ statusText(row) }}</small>
              </span>
              <span class="row-amount" :class="row.parsed.type || ''">
                {{ row.parsed.amount !== null ? `${row.parsed.type === 'income' ? '+' : '-'}${formatCurrency(row.parsed.amount)}` : '—' }}
              </span>
            </label>
          </template>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" :disabled="busy" @click="$emit('close')">Cerrar</button>
          <button v-if="!searched || !selectedCount" class="btn-save" :disabled="busy || !from || !to" @click="search">
            {{ busy ? 'Buscando...' : 'Buscar' }}
          </button>
          <button v-else class="btn-save" :disabled="busy" @click="send">
            {{ busy ? 'Enviando...' : `Enviar a Por confirmar (${selectedCount})` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'
import { addDaysISO, daysBetween, parseISODate, toISODate, todayISO } from '@/utils/dates'
import { parseBankNotification, type ParsedNotification } from '@/utils/bankNotifications'
import { readBankSms } from '@/services/notificationListener'
import type { PendingTransaction } from '@/interfaces'

const emit = defineEmits(['close', 'sent'])
const store = useFinanceStore()

const today = todayISO()
const from = ref(addDaysISO(today, -7))
const to = ref(today)
const busy = ref(false)
const error = ref('')
const searched = ref(false)

const presets = [
  { label: 'Últimos 3 días', days: 3 },
  { label: '7 días', days: 7 },
  { label: '15 días', days: 15 },
  { label: '30 días', days: 30 }
]

function setDays(days: number) {
  from.value = addDaysISO(today, -days)
  to.value = today
}

type RowStatus = 'new' | 'registered' | 'pending'
interface Row {
  item: PendingTransaction
  parsed: ParsedNotification
  status: RowStatus
  include: boolean
}

const rows = ref<Row[]>([])
const newCount = computed(() => rows.value.filter(r => r.status === 'new').length)
const selectedCount = computed(() => rows.value.filter(r => r.include && r.status !== 'pending').length)

// Al cambiar las fechas se vuelve a buscar
watch([from, to], () => {
  searched.value = false
  rows.value = []
})

// ¿Ya hay un movimiento igual en la app? Mismo tipo y monto (±1) a ±1 día
function isRegistered(parsed: ParsedNotification, dateISO: string): boolean {
  if (parsed.amount === null) return false
  const day = parseISODate(dateISO)
  return store.transactions.some(t =>
    t.type === parsed.type &&
    Math.abs(t.amount - parsed.amount!) <= 1 &&
    Math.abs(daysBetween(parseISODate(t.date), day)) <= 1
  )
}

async function search() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const messages = await readBankSms(from.value, to.value)
    const pendingIds = new Set(store.pendingTransactions.map(p => p.id))

    rows.value = messages.map(item => {
      const bank = item.bank || 'bancolombia'
      const parsed = parseBankNotification(item.title, item.text, bank)
      const date = parsed.date || toISODate(new Date(item.receivedAt))
      const status: RowStatus = pendingIds.has(item.id)
        ? 'pending'
        : isRegistered(parsed, date) ? 'registered' : 'new'
      return { item, parsed, status, include: status === 'new' && parsed.amount !== null }
    })
    searched.value = true
  } catch (e) {
    const err = e as { code?: string; message?: string }
    error.value = err.code === 'SMS_DENIED'
      ? 'Sin permiso para leer SMS. Actívalo en Ajustes > Apps > JeiXSoft > Permisos > SMS.'
      : err.message || 'No se pudieron leer los SMS.'
  } finally {
    busy.value = false
  }
}

async function send() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const items = rows.value.filter(r => r.include && r.status !== 'pending').map(r => r.item)
    await store.addPendingTransactions(items)
    emit('sent', items.length)
    emit('close')
  } catch (e) {
    error.value = (e as Error).message || 'No se pudieron enviar.'
  } finally {
    busy.value = false
  }
}

function statusText(row: Row) {
  if (row.status === 'pending') return 'ya está en Por confirmar'
  if (row.status === 'registered') return 'parece ya registrado'
  return row.parsed.amount === null ? 'sin monto reconocido' : 'sin registrar'
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
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
  max-width: 560px;
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0;
}

.modal-header h2 { font-size: 19px; color: var(--text-primary); }
.subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.modal-close { background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; }

.modal-body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 18px;
  border-top: 1px solid var(--border);
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }

.form-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  width: 100%;
  min-width: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  -webkit-appearance: none;
  appearance: none;
}

.presets { display: flex; flex-wrap: wrap; gap: 6px; }

.presets button {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 12px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.hint { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.error { font-size: 13px; color: var(--accent-red); }
.summary { font-size: 13px; color: var(--text-secondary); }

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  cursor: pointer;
}

.row.off { opacity: 0.6; }
.row.done { border-style: dashed; }
.row input { flex-shrink: 0; width: 16px; height: 16px; accent-color: var(--accent-green); }
.row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.row-info strong {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-info small { font-size: 11px; color: var(--text-muted); }
.row-amount { flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary); }
.row-amount.income { color: var(--accent-green); }
.row-amount.expense { color: var(--accent-red); }

.btn-cancel,
.btn-save { padding: 10px 16px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.btn-cancel { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); }
.btn-save { border: none; background: linear-gradient(135deg, var(--accent-green), #00b377); color: #000; font-weight: 600; }
.btn-save:disabled,
.btn-cancel:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 480px) {
  .modal-backdrop { padding: 10px; align-items: flex-end; }
  .modal-body { padding: 14px 16px; }
}
</style>
