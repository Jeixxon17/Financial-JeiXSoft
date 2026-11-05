<template>
  <TpSheet :title="goal ? 'Editar meta' : 'Nueva meta de ahorro'" wide @close="!saving && $emit('close')">
    <p class="m-0 text-sm text-ink-muted">Te decimos cuánto ahorrar al mes y por quincena para llegar a tiempo.</p>

    <div class="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">¿Para qué ahorras?</span>
          <input v-model="form.name" :class="fieldInput" placeholder="Ej: Viaje a Punta Cana" />
        </label>

        <div class="flex flex-col gap-2">
          <span :class="fieldLabel">Ícono</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="g in goalIcons"
              :key="g.key"
              type="button"
              class="grid grid-cols-[minmax(0,1fr)] size-11 cursor-pointer place-items-center rounded-full border transition-colors [&_svg]:size-[18px]"
              :class="form.icon === g.key ? 'border-primary bg-primary text-white' : 'border-line bg-surface-200 text-ink hover:border-line-strong'"
              :aria-label="g.label"
              :aria-pressed="form.icon === g.key"
              @click="form.icon = g.key"
            >
              <component :is="g.icon" :stroke-width="1.75" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Empiezo el</span>
            <input v-model="form.startDate" type="date" :class="fieldInput" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="fieldLabel">Lo necesito el</span>
            <input v-model="form.targetDate" type="date" :class="fieldInput" />
          </label>
        </div>

        <!-- Desglose -->
        <div class="flex flex-col gap-2">
          <span :class="fieldLabel">¿En qué se va el dinero? (opcional)</span>
          <div v-for="item in form.items" :key="item.id" class="grid grid-cols-[minmax(0,1fr)_130px_40px] gap-2">
            <input v-model="item.name" :class="fieldInput" placeholder="Ej: Vuelos" aria-label="Gasto" />
            <input v-model.number="item.amount" type="number" min="0" :class="fieldInput" placeholder="0" aria-label="Valor" />
            <button
              type="button"
              class="grid grid-cols-[minmax(0,1fr)] cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-surface-200 hover:text-danger [&_svg]:size-4"
              aria-label="Quitar"
              @click="removeItem(item.id)"
            >
              <Trash2 :stroke-width="1.75" aria-hidden="true" />
            </button>
          </div>
          <button type="button" class="cursor-pointer self-start p-1 text-sm font-medium text-accent-light hover:text-ink" @click="addItem">+ Agregar gasto</button>
        </div>

        <label v-if="!form.items.length" class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Total de la meta</span>
          <input v-model.number="form.targetAmount" type="number" min="0" :class="fieldInput" placeholder="0" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span :class="fieldLabel">Notas</span>
          <textarea v-model="form.notes" rows="3" :class="[fieldInput, 'py-3']" placeholder="Supuestos, fechas, ideas…" />
        </label>

        <label v-if="goal" class="flex cursor-pointer items-center gap-3 text-sm">
          <input v-model="form.active" type="checkbox" class="size-4 accent-primary" />
          Meta activa (cuenta en el plan del mes y en las quincenas)
        </label>
      </div>

      <!-- Para llegar a tiempo -->
      <div class="flex flex-col gap-2.5 rounded-card border border-primary bg-primary-soft/60 p-5">
        <span class="text-sm font-medium text-ink-muted">Para llegar a tiempo</span>
        <template v-if="preview">
          <span class="text-[30px]/9 font-semibold text-accent-light tabular-nums">{{ money(preview.monthly) }}</span>
          <span class="text-sm text-ink-muted">al mes · {{ money(preview.perQuincena) }} por quincena</span>
        </template>
        <span v-else class="text-sm text-ink-faint">Escribe el nombre, las fechas y el total para calcularlo.</span>
        <div class="my-1.5 h-px bg-line" />
        <div class="flex justify-between text-[13px] text-ink-muted"><span>Total</span><strong class="text-ink tabular-nums">{{ money(total) }}</strong></div>
        <div v-if="preview" class="flex justify-between text-[13px] text-ink-muted"><span>Meses de ahorro</span><strong class="text-ink">{{ preview.monthsLeft }}</strong></div>
      </div>
    </div>

    <p v-if="error" class="m-0 text-sm text-danger">{{ error }}</p>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" :disabled="saving" @click="$emit('close')">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="saving || !canSave" @click="save">
        {{ saving ? 'Guardando…' : goal ? 'Guardar cambios' : 'Crear meta' }}
      </TpButton>
    </template>
  </TpSheet>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { Trash2 } from 'lucide-vue-next'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import { fieldInput, fieldLabel, money } from '@/components/tp/format'
import { goalIcons } from '@/components/tp/goalIcons'
import { todayISO } from '@/utils/dates'
import { goalStatus } from '@/utils/plan'
import type { SavingsGoal, SavingsGoalItem } from '@/interfaces'

const props = defineProps<{ goal?: SavingsGoal | null }>()
const emit = defineEmits(['close'])

const store = useFinanceStore()

const form = reactive({
  name: props.goal?.name || '',
  icon: props.goal?.icon || '✈️',
  startDate: props.goal?.startDate || todayISO(),
  targetDate: props.goal?.targetDate || '',
  targetAmount: props.goal?.targetAmount || 0,
  items: (props.goal?.items || []).map(i => ({ ...i })) as SavingsGoalItem[],
  notes: props.goal?.notes || '',
  active: props.goal?.active ?? true
})
const saving = ref(false)
const error = ref('')

const itemsTotal = computed(() => form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0))
const total = computed(() => (form.items.length ? itemsTotal.value : form.targetAmount))
const canSave = computed(() => !!form.name.trim() && !!form.targetDate && total.value > 0)

// Cuánto tocaría ahorrar con lo que va escrito
const preview = computed(() => {
  if (!canSave.value || form.targetDate <= form.startDate) return null
  return goalStatus(draft(), todayISO())
})

function addItem() {
  form.items.push({ id: `it_${Date.now()}`, name: '', amount: 0 })
}

function removeItem(id: string) {
  form.items = form.items.filter(i => i.id !== id)
}

function draft(): SavingsGoal {
  return {
    id: props.goal?.id || '',
    name: form.name.trim(),
    icon: form.icon,
    color: props.goal?.color || '#4f6fdc',
    targetAmount: total.value,
    startDate: form.startDate,
    targetDate: form.targetDate,
    items: form.items.filter(i => i.name.trim() || i.amount).map(i => ({ ...i, amount: Number(i.amount) || 0 })),
    contributions: props.goal?.contributions || [],
    notes: form.notes.trim(),
    active: form.active
  }
}

async function save() {
  if (!canSave.value || saving.value) return
  if (form.targetDate <= form.startDate) {
    error.value = 'La fecha de la meta debe ser después de la fecha en que empiezas a ahorrar.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { id, ...data } = draft()
    if (props.goal) await store.updateSavingsGoal(id, data)
    else await store.addSavingsGoal(data)
    emit('close')
  } catch (e) {
    error.value = (e as Error).message || 'No se pudo guardar la meta.'
  } finally {
    saving.value = false
  }
}
</script>
