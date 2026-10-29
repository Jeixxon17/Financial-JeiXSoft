<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!saving && $emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ goal ? 'Editar meta' : 'Nueva meta de ahorro' }}</h2>
          <button class="modal-close" :disabled="saving" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" type="text" placeholder="Ej: Viaje a Punta Cana" />
          </div>

          <div class="form-group">
            <label>Icono</label>
            <div class="icon-row">
              <button
                v-for="icon in icons"
                :key="icon"
                type="button"
                class="icon-btn"
                :class="{ active: form.icon === icon }"
                @click="form.icon = icon"
              >{{ icon }}</button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Empiezo a ahorrar</label>
              <input v-model="form.startDate" type="date" />
            </div>
            <div class="form-group">
              <label>Necesito el dinero el *</label>
              <input v-model="form.targetDate" type="date" />
            </div>
          </div>

          <!-- Desglose -->
          <div class="form-group">
            <label>¿En qué se va el dinero? (opcional)</label>
            <div v-for="item in form.items" :key="item.id" class="item-row">
              <input v-model="item.name" type="text" placeholder="Ej: Vuelos" />
              <input v-model.number="item.amount" type="number" min="0" placeholder="0" />
              <button type="button" class="remove-btn" @click="removeItem(item.id)">✕</button>
            </div>
            <button type="button" class="add-item" @click="addItem">+ Agregar gasto</button>
          </div>

          <div class="form-group">
            <label>Total de la meta *</label>
            <input
              v-if="!form.items.length"
              v-model.number="form.targetAmount"
              type="number"
              min="0"
              placeholder="0"
            />
            <strong v-else class="total">{{ formatCurrency(itemsTotal) }}</strong>
          </div>

          <div v-if="preview" class="preview">
            <span>Para llegar a tiempo</span>
            <strong>{{ formatCurrency(preview.monthly) }} al mes</strong>
            <small>{{ formatCurrency(preview.perQuincena) }} por quincena · {{ preview.monthsLeft }} meses</small>
          </div>

          <div class="form-group">
            <label>Notas</label>
            <textarea v-model="form.notes" rows="3" placeholder="Supuestos, fechas, ideas..." />
          </div>

          <label v-if="goal" class="check">
            <input v-model="form.active" type="checkbox" />
            Meta activa (cuenta en el plan del mes y en las quincenas)
          </label>

          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" :disabled="saving" @click="$emit('close')">Cancelar</button>
          <button class="btn-save" :disabled="saving || !canSave" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency } from '@/utils/formatters'
import { todayISO } from '@/utils/dates'
import { goalStatus } from '@/utils/plan'
import type { SavingsGoal, SavingsGoalItem } from '@/interfaces'

const props = defineProps<{ goal?: SavingsGoal | null }>()
const emit = defineEmits(['close'])

const store = useFinanceStore()
const icons = ['⚽', '✈️', '🏝️', '🛟', '🏍️', '🏠', '🎓', '💍', '🎮', '🚗', '💻', '🎁']

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
    color: props.goal?.color || '#00d68f',
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
  max-width: 520px;
  max-height: calc(100dvh - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
}

.modal-header h2 { font-size: 19px; color: var(--text-primary); }

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.modal-body {
  padding: 18px 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 18px;
  flex-shrink: 0;
  border-top: 1px solid var(--border);
}

/* Android pone un ancho mínimo a los campos de fecha */
input[type='date'] { min-width: 0; max-width: 100%; appearance: none; -webkit-appearance: none; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }

.form-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

input,
textarea {
  width: 100%;
  min-width: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}

.icon-row { display: flex; flex-wrap: wrap; gap: 6px; }

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  font-size: 18px;
  cursor: pointer;
}

.icon-btn.active { border-color: var(--accent-green); background: rgba(0, 214, 143, 0.12); }

.item-row { display: grid; grid-template-columns: 1fr 130px 32px; gap: 6px; align-items: center; }

.remove-btn {
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
}

.add-item {
  align-self: flex-start;
  background: none;
  border: 1px dashed var(--border-light);
  border-radius: 8px;
  padding: 6px 12px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.total { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: var(--text-primary); }

.preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 214, 143, 0.1);
  border: 1px solid rgba(0, 214, 143, 0.3);
}

.preview span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
.preview strong { font-size: 18px; color: var(--accent-green); font-family: 'JetBrains Mono', monospace; }
.preview small { font-size: 12px; color: var(--text-secondary); }

.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.check input { width: 16px; height: 16px; accent-color: var(--accent-green); }

.error { font-size: 13px; color: var(--accent-red); }

.btn-cancel,
.btn-save {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); }

.btn-save {
  border: none;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  color: #000;
  font-weight: 600;
}

.btn-save:disabled,
.btn-cancel:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 480px) {
  .modal-backdrop { padding: 10px; align-items: flex-end; }
  .modal-body { padding: 16px; }
  .form-row { grid-template-columns: 1fr; }
  .item-row { grid-template-columns: 1fr 100px 32px; }
}
</style>
