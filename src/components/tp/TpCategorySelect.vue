<template>
  <!-- Lista de categorías con "Nueva categoría…" para crearla ahí mismo -->
  <div class="flex flex-col gap-2">
    <select :value="modelValue" :class="fieldInput" :aria-label="label" @change="onChange">
      <option value="">Elige una categoría</option>
      <option v-for="cat in options" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      <option :value="NEW_OPTION">+ Nueva categoría…</option>
    </select>

    <div v-if="creating" class="flex gap-2">
      <input
        ref="nameInput"
        v-model="newName"
        :class="fieldInput"
        placeholder="Nombre de la categoría"
        @keydown.enter.prevent="create"
        @keydown.esc.stop.prevent="creating = false"
      />
      <TpButton size="sm" :disabled="!newName.trim() || saving" @click="create">Crear</TpButton>
    </div>
    <p v-if="creating && duplicate" class="m-0 text-xs text-ink-faint">Ya existe "{{ duplicate.name }}": se usará esa.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import TpButton from './TpButton.vue'
import { fieldInput } from './format'
import { useFinanceStore } from '@/stores/finance'

const props = withDefaults(defineProps<{
  modelValue: string
  type: 'income' | 'expense'
  label?: string
}>(), { label: 'Categoría' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const NEW_OPTION = '__new__'
const store = useFinanceStore()
const creating = ref(false)
const saving = ref(false)
const newName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const options = computed(() =>
  store.categories
    .filter(c => c.id !== 'transfer' && (c.type === 'both' || c.type === props.type))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
)

const duplicate = computed(() => {
  const key = newName.value.trim().toLowerCase()
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
  newName.value = ''
  creating.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  const name = newName.value.trim()
  if (!name || saving.value) return
  saving.value = true
  try {
    const id = await store.addCategory({ name, icon: '🏷️', color: '#5f7fe8', type: props.type })
    if (id) {
      emit('update:modelValue', id)
      creating.value = false
    }
  } finally {
    saving.value = false
  }
}
</script>
