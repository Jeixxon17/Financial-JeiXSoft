<template>
  <div class="category-select">
    <select :value="modelValue" @change="onChange">
      <option value="">Seleccionar...</option>
      <option v-for="cat in options" :key="cat.id" :value="cat.id">
        {{ cat.icon }} {{ cat.name }}
      </option>
      <option :value="NEW_OPTION">➕ Nueva categoría...</option>
    </select>

    <div v-if="creating" class="new-category">
      <input
        ref="nameInput"
        v-model="newCat.name"
        type="text"
        placeholder="Nombre de la categoría"
        @keydown.enter.prevent="create"
        @keydown.esc.prevent="creating = false"
      />

      <div class="pickers">
        <div class="icon-row">
          <button
            v-for="icon in icons"
            :key="icon"
            type="button"
            class="icon-opt"
            :class="{ selected: newCat.icon === icon }"
            @click="newCat.icon = icon"
          >{{ icon }}</button>
        </div>

        <div class="color-row">
          <button
            v-for="color in colors"
            :key="color"
            type="button"
            class="color-opt"
            :style="{ background: color }"
            :class="{ selected: newCat.color === color }"
            @click="newCat.color = color"
          />
        </div>
      </div>

      <p v-if="duplicate" class="hint">Ya existe “{{ duplicate.name }}”, se usará esa.</p>

      <div class="new-actions">
        <button type="button" class="btn-ghost" @click="creating = false">Cancelar</button>
        <button
          type="button"
          class="btn-create"
          :disabled="!newCat.name.trim() || isSaving"
          @click="create"
        >
          {{ isSaving ? 'Creando...' : 'Crear' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import type { Category } from '@/interfaces'

const props = defineProps<{
  modelValue: string
  type: 'income' | 'expense'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const NEW_OPTION = '__new__'

const store = useFinanceStore()
const creating = ref(false)
const isSaving = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const icons = ['🍔', '🛒', '🚗', '🏍️', '🏠', '💡', '📱', '🎮', '🎬', '🏥', '📚', '👕', '✈️', '🐶', '💳', '💼', '💰', '📦']
const colors = ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#eab308', '#6b7280']

const newCat = reactive({ name: '', icon: '📦', color: '#6366f1' })

const options = computed(() =>
  store.categories
    .filter(c => c.type === 'both' || c.type === props.type)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
)

const duplicate = computed<Category | undefined>(() => {
  const key = newCat.name.trim().toLowerCase()
  return key ? store.categories.find(c => c.name.trim().toLowerCase() === key) : undefined
})

async function onChange(e: Event) {
  const select = e.target as HTMLSelectElement

  if (select.value !== NEW_OPTION) {
    emit('update:modelValue', select.value)
    return
  }

  // Mantiene la selección anterior mientras se crea la nueva
  select.value = props.modelValue
  Object.assign(newCat, { name: '', icon: '📦', color: '#6366f1' })
  creating.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  const name = newCat.name.trim()
  if (!name || isSaving.value) return

  isSaving.value = true
  try {
    const id = await store.addCategory({
      name,
      icon: newCat.icon,
      color: newCat.color,
      type: props.type
    })

    if (id) {
      emit('update:modelValue', id)
      creating.value = false
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.category-select { display: flex; flex-direction: column; gap: 8px; }

.category-select select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
  transition: border-color 0.2s;
}

.category-select select:focus { outline: none; border-color: var(--accent-green); }

.category-select option { background: var(--bg-elevated); }

.new-category {
  background: var(--bg-elevated);
  border: 1px solid var(--accent-green);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-category input {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
}

.new-category input:focus { outline: none; border-color: var(--accent-green); }

.pickers { display: flex; flex-direction: column; gap: 6px; }

.icon-row, .color-row { display: flex; flex-wrap: wrap; gap: 4px; }

.icon-opt {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-opt.selected { border-color: var(--accent-green); background: var(--accent-green-dim); }

.color-opt {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-opt.selected { border-color: white; transform: scale(1.15); }

.hint { font-size: 11px; color: var(--accent-amber); }

.new-actions { display: flex; justify-content: flex-end; gap: 6px; }

.btn-ghost, .btn-create {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-ghost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.btn-create {
  background: var(--accent-green);
  border: none;
  color: #000;
  font-weight: 600;
}

.btn-create:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
