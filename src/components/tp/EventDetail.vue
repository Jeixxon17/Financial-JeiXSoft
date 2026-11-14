<template>
  <TpSheet :title="event.name" wide @close="emit('close')">
    <!-- Total -->
    <div class="flex flex-col items-center gap-2 pt-1 text-center">
      <span class="grid size-14 place-items-center rounded-full [&_svg]:size-6" :style="{ background: `${event.color}26`, color: event.color }">
        <component :is="eventIcon(event.icon)" :stroke-width="1.75" aria-hidden="true" />
      </span>
      <span class="text-sm text-ink-muted">{{ range }}</span>
      <span class="text-[40px]/[46px] font-semibold tracking-[-1px] tabular-nums">{{ money(summary.total) }}</span>
      <span class="inline-flex items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold">
        {{ ongoing ? 'En curso' : 'Terminado' }}
      </span>
    </div>

    <!-- Datos rápidos -->
    <div class="grid grid-cols-3 gap-2">
      <div v-for="stat in stats" :key="stat.label" class="flex flex-col gap-0.5 rounded-tile bg-surface-200 px-3 py-2.5">
        <span class="text-[11px]/[14px] text-ink-faint">{{ stat.label }}</span>
        <strong class="text-sm font-semibold tabular-nums">{{ stat.value }}</strong>
      </div>
    </div>

    <!-- Presupuesto del evento -->
    <div v-if="event.budget" class="flex flex-col gap-2 rounded-tile border border-line px-4 py-3">
      <div class="flex justify-between gap-3 text-sm">
        <span class="text-ink-muted">Pensabas gastar {{ money(event.budget) }}</span>
        <strong class="font-semibold tabular-nums" :class="{ 'text-warning': left < 0 }">
          {{ left < 0 ? `Te pasaste ${money(-left)}` : `Quedan ${money(left)}` }}
        </strong>
      </div>
      <span class="h-2 overflow-hidden rounded-full bg-surface-300">
        <span class="block h-full rounded-full" :class="left < 0 ? 'bg-warning' : 'bg-primary'" :style="{ width: `${budgetPct}%` }" />
      </span>
    </div>

    <!-- En qué se fue -->
    <div v-if="categories.length" class="flex flex-col gap-2.5">
      <span class="text-sm font-semibold">En qué se fue</span>
      <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <span v-for="c in categories" :key="c.id" class="h-full" :style="{ width: `${c.pct}%`, background: c.color }" />
      </div>
      <div v-for="c in categories" :key="c.id" class="flex items-center gap-2.5 text-sm">
        <span class="size-2.5 shrink-0 rounded-full" :style="{ background: c.color }" />
        <span class="min-w-0 flex-1 truncate text-ink-muted">{{ c.name }}</span>
        <span class="text-xs text-ink-faint tabular-nums">{{ c.pct }} %</span>
        <strong class="w-28 text-right font-semibold tabular-nums">{{ money(c.amount) }}</strong>
      </div>
    </div>

    <!-- Gastos -->
    <div class="flex flex-col gap-2">
      <span class="text-sm font-semibold">Gastos</span>
      <p v-if="!summary.count" class="m-0 rounded-tile bg-surface-200 p-4 text-center text-[13px]/[19px] text-ink-faint">
        Aún no hay gastos aquí. Los que registres {{ ongoing ? 'desde ahora' : 'en estas fechas' }} se pueden agregar al elegir el evento en el gasto.
      </p>
      <button
        v-for="tx in summary.transactions"
        :key="tx.id"
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-surface-200 px-4 py-2.5 text-left transition-colors hover:bg-surface-300"
        @click="emit('openTx', tx)"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-semibold">{{ tx.description || categoryName(tx.category) }}</span>
          <span class="text-xs text-ink-faint">{{ shortDate(parseISO(tx.date)) }} · {{ categoryName(tx.category) }}</span>
        </span>
        <span class="text-sm font-semibold whitespace-nowrap tabular-nums">−{{ money(tx.amount) }}</span>
      </button>
    </div>

    <template #footer>
      <TpButton variant="danger" class="flex-1 lg:flex-none" @click="confirming = true">
        <Trash2 :stroke-width="1.75" aria-hidden="true" />
        Eliminar
      </TpButton>
      <TpButton v-if="ongoing" variant="secondary" class="flex-1 lg:flex-none" :disabled="busy" @click="ending = true">Terminar hoy</TpButton>
      <TpButton class="flex-1 lg:flex-none" @click="emit('edit', event)">
        <Pencil :stroke-width="1.75" aria-hidden="true" />
        Editar
      </TpButton>
    </template>
  </TpSheet>

  <TpConfirm
    v-if="confirming"
    :title="`¿Eliminar ${event.name}?`"
    text="Los gastos no se borran: siguen en tus movimientos, solo dejan de estar en este evento."
    :busy="busy"
    @cancel="confirming = false"
    @confirm="remove"
  />

  <!-- Terminar no tiene vuelta atrás: se confirma antes -->
  <TpConfirm
    v-if="ending"
    :title="`¿Terminar ${event.name}?`"
    text="Queda cerrado para siempre: los gastos nuevos y los de Por confirmar ya no se podrán agregar a este evento. Lo que ya tiene se conserva."
    confirm-label="Sí, terminar"
    busy-label="Terminando…"
    :busy="busy"
    @cancel="ending = false"
    @confirm="finish"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import TpConfirm from './TpConfirm.vue'
import { eventIcon } from './eventIcons'
import { eventDays, eventRange } from './eventFormat'
import { money, parseISO, shortDate } from './format'
import { useFinanceStore } from '@/stores/finance'
import { todayISO } from '@/utils/dates'
import type { SpendingEvent, Transaction } from '@/interfaces'

const props = defineProps<{ event: SpendingEvent }>()
const emit = defineEmits<{ close: []; edit: [event: SpendingEvent]; openTx: [tx: Transaction] }>()
const store = useFinanceStore()

const summary = computed(() => store.eventSummary(props.event.id))
const ongoing = computed(() => store.isEventOngoing(props.event))
const range = computed(() => eventRange(props.event))
const days = computed(() => eventDays(props.event))

const stats = computed(() => [
  { label: 'Días', value: days.value ? String(days.value) : '—' },
  { label: 'Por día', value: days.value ? money(Math.round(summary.value.total / days.value)) : '—' },
  { label: 'Gastos', value: String(summary.value.count) }
])

const left = computed(() => (props.event.budget || 0) - summary.value.total)
const budgetPct = computed(() => Math.min(100, Math.round((summary.value.total / (props.event.budget || 1)) * 100)))

const categoryName = (id: string) => store.getCategoryById(id)?.name || 'Sin categoría'

const categories = computed(() => {
  const total = summary.value.total || 1
  return summary.value.byCategory.map(c => {
    const cat = store.getCategoryById(c.categoryId)
    return {
      id: c.categoryId,
      name: cat?.name || 'Sin categoría',
      color: cat?.color || '#a6b0c9',
      amount: c.amount,
      pct: Math.round((c.amount / total) * 100)
    }
  })
})

const busy = ref(false)
const confirming = ref(false)

const ending = ref(false)

// Terminar hoy: se cierra para siempre (no se puede reabrir) y ya no se ofrece
// en los gastos nuevos ni en Por confirmar
async function finish() {
  busy.value = true
  try {
    const today = todayISO()
    const e = props.event
    const end = !e.endDate || e.endDate > today ? today : e.endDate
    await store.updateEvent(e.id, { closed: true, endDate: end < e.startDate ? e.startDate : end })
    ending.value = false
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await store.deleteEvent(props.event.id)
    emit('close')
  } finally {
    busy.value = false
  }
}
</script>
