<template>
  <TpSheet :title="event ? 'Editar viaje o evento' : 'Nuevo viaje o evento'" @close="emit('close')">
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Nombre</span>
      <input v-model="form.name" :class="fieldInput" placeholder="Ej: Bogotá, Boda de Ana, Paseo a Guatapé" maxlength="40" />
    </label>

    <div class="flex flex-col gap-2">
      <span :class="fieldLabel">Ícono</span>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="item in eventIcons"
          :key="item.key"
          type="button"
          class="grid aspect-square cursor-pointer place-items-center rounded-tile border transition-colors [&_svg]:size-5"
          :class="form.icon === item.key ? 'border-primary bg-primary-soft text-ink' : 'border-line bg-surface-200 text-ink-muted hover:text-ink'"
          :aria-label="item.label"
          :aria-pressed="form.icon === item.key"
          @click="form.icon = item.key"
        >
          <component :is="item.icon" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span :class="fieldLabel">Color</span>
      <div class="flex flex-wrap gap-2.5">
        <button
          v-for="color in eventColors"
          :key="color"
          type="button"
          class="size-9 cursor-pointer rounded-full ring-offset-2 ring-offset-surface-100 transition-shadow"
          :class="{ 'ring-2 ring-ink': form.color === color }"
          :style="{ background: color }"
          :aria-label="`Color ${color}`"
          :aria-pressed="form.color === color"
          @click="form.color = color"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Desde</span>
        <input v-model="form.startDate" type="date" :class="fieldInput" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span :class="fieldLabel">Hasta (opcional)</span>
        <input v-model="form.endDate" type="date" :min="form.startDate" :class="fieldInput" />
      </label>
    </div>
    <p class="m-0 text-xs text-ink-faint">
      Mientras esté en curso, los gastos que registres en esas fechas quedan en este evento. Igual puedes cambiarlo en cada gasto.
    </p>

    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">¿Cuánto piensas gastar? (opcional)</span>
      <input v-model="budgetText" inputmode="numeric" :class="fieldInput" placeholder="$ 0" />
    </label>

    <!-- Gastos que ya estaban registrados en esas fechas -->
    <label v-if="!event && pastCount > 0" class="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-surface-200 px-4 py-3">
      <input v-model="includePast" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
      <span class="text-sm">
        Incluir {{ pastCount === 1 ? 'el gasto' : `los ${pastCount} gastos` }} que ya registraste en esas fechas
        <small class="mt-0.5 block text-xs text-ink-faint">{{ money(pastTotal) }} · los que no están en otro evento</small>
      </span>
    </label>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="emit('close')">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!!missing || saving" @click="save">
        {{ saving ? 'Guardando…' : missing || (event ? 'Guardar cambios' : 'Crear') }}
      </TpButton>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import { eventColors, eventIcons } from './eventIcons'
import { fieldInput, fieldLabel, money, plain } from './format'
import { useFinanceStore } from '@/stores/finance'
import { todayISO } from '@/utils/dates'
import type { SpendingEvent } from '@/interfaces'

const props = defineProps<{ event?: SpendingEvent }>()
const emit = defineEmits<{ close: []; saved: [id: string] }>()
const store = useFinanceStore()

const form = reactive({
  name: props.event?.name || '',
  icon: props.event?.icon || 'map-pin',
  color: props.event?.color || eventColors[0],
  startDate: props.event?.startDate || todayISO(),
  endDate: props.event?.endDate || '',
  budget: props.event?.budget || 0
})

const budgetText = computed({
  get: () => (form.budget ? `$ ${plain(form.budget)}` : ''),
  set: (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12)
    form.budget = digits ? Number(digits) : 0
  }
})

// Gastos ya registrados en las fechas del evento nuevo, sin evento
const pastExpenses = computed(() =>
  store.transactions.filter(
    t =>
      !t.eventId &&
      t.type === 'expense' &&
      t.category !== 'transfer' &&
      t.date >= form.startDate &&
      (!form.endDate || t.date <= form.endDate)
  )
)
const pastCount = computed(() => pastExpenses.value.length)
const pastTotal = computed(() => pastExpenses.value.reduce((sum, t) => sum + t.amount, 0))
const includePast = ref(true)

const missing = computed(() => {
  if (!form.name.trim()) return 'Escribe el nombre'
  if (!form.startDate) return 'Elige desde cuándo'
  if (form.endDate && form.endDate < form.startDate) return 'Revisa las fechas'
  return ''
})

const saving = ref(false)

async function save() {
  if (missing.value || saving.value) return
  saving.value = true
  try {
    // Firestore no acepta undefined: los opcionales vacíos se guardan vacíos
    const data: Omit<SpendingEvent, 'id'> = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget
    }
    let id = props.event?.id || ''
    if (props.event) await store.updateEvent(props.event.id, data)
    else id = await store.addEvent(data, includePast.value && pastCount.value > 0)
    emit('saved', id)
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>
