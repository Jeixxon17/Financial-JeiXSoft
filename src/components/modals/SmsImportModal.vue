<template>
  <TpSheet title="Buscar SMS del banco" @close="!busy && $emit('close')">
    <p class="m-0 text-sm text-ink-muted">Recupera movimientos que no llegaron a Por confirmar.</p>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Desde</span>
        <input v-model="from" type="date" :max="to" :class="fieldInput" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Hasta</span>
        <input v-model="to" type="date" :min="from" :max="today" :class="fieldInput" />
      </label>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in presets"
        :key="p.days"
        type="button"
        class="min-h-9 cursor-pointer rounded-full border border-line bg-surface-200 px-4 text-[13px] font-medium text-ink-muted hover:text-ink"
        @click="setDays(p.days)"
      >
        {{ p.label }}
      </button>
    </div>

    <p class="m-0 text-xs/[17px] text-ink-faint">
      Se leen los SMS de Bancolombia que siguen en tu celular. Las notificaciones de las apps no se pueden recuperar: Android no las guarda.
    </p>

    <p v-if="error" class="m-0 text-sm text-danger">{{ error }}</p>

    <template v-if="searched">
      <p v-if="!rows.length" class="m-0 text-sm text-ink-faint">No hay SMS del banco entre esas fechas.</p>
      <p v-else class="m-0 rounded-tile bg-surface-200 px-4 py-2.5 text-[13px] text-ink-muted">
        {{ rows.length }} SMS · {{ newCount }} sin registrar · {{ rows.length - newCount }} ya registrados o en espera
      </p>
      <label
        v-for="row in rows"
        :key="row.item.id"
        class="flex cursor-pointer items-center gap-3 rounded-tile bg-surface-200/50 px-3 py-2.5"
        :class="{ 'opacity-60': !row.include }"
      >
        <input v-model="row.include" type="checkbox" class="size-4 shrink-0 accent-primary" :disabled="row.status === 'pending'" />
        <span class="flex min-w-0 flex-1 flex-col">
          <strong class="truncate text-sm font-semibold">{{ row.parsed.description || row.item.text.slice(0, 60) }}</strong>
          <small class="text-xs text-ink-faint">{{ formatWhen(row.item.receivedAt) }} · {{ statusText(row) }}</small>
        </span>
        <span class="text-sm font-semibold whitespace-nowrap tabular-nums" :class="{ 'text-success': row.parsed.type === 'income' }">
          {{ row.parsed.amount !== null ? `${row.parsed.type === 'income' ? '+' : '−'}${plain(row.parsed.amount)}` : '—' }}
        </span>
      </label>
    </template>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" :disabled="busy" @click="$emit('close')">Cerrar</TpButton></div>
      <TpButton v-if="!searched || !selectedCount" block class="lg:w-auto lg:min-w-40" :disabled="busy || !from || !to" @click="search">
        {{ busy ? 'Buscando…' : 'Buscar' }}
      </TpButton>
      <TpButton v-else block class="lg:w-auto lg:min-w-48" :disabled="busy" @click="send">
        {{ busy ? 'Enviando…' : `Enviar a Por confirmar (${selectedCount})` }}
      </TpButton>
    </template>
  </TpSheet>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { fieldInput, fieldLabel, plain } from '@/components/tp/format'
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
      ? 'Sin permiso para leer SMS. Actívalo en Ajustes > Apps > la app > Permisos > SMS.'
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
