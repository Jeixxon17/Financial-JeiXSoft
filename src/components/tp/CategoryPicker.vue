<template>
  <!--
    Categorías como botones grandes (ícono + nombre): las más usadas primero y "Más"
    abre el buscador con todas y la opción de crear una nueva.
  -->
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
      <button
        v-for="cat in quick"
        :key="cat.id"
        type="button"
        :class="tile(cat.id === modelValue)"
        :aria-pressed="cat.id === modelValue"
        @click="emit('update:modelValue', cat.id)"
      >
        <span class="relative grid size-11 place-items-center rounded-full [&_svg]:size-5" :style="iconStyle(cat.color, cat.id === modelValue)">
          <component :is="categoryIcon(cat)" :stroke-width="1.75" aria-hidden="true" />
          <span v-if="cat.id === modelValue" class="absolute -right-0.5 -bottom-0.5 grid size-[18px] place-items-center rounded-full border-2 border-surface-100 bg-primary text-white [&_svg]:size-2.5">
            <Check :stroke-width="3.5" aria-hidden="true" />
          </span>
        </span>
        <span class="line-clamp-2 w-full text-center text-xs/4 font-medium hyphens-auto">{{ cat.name }}</span>
      </button>

      <button type="button" :class="tile(false)" @click="openAll">
        <span class="grid size-11 place-items-center rounded-full border border-dashed border-line-strong text-accent-light [&_svg]:size-5">
          <LayoutGrid :stroke-width="1.75" aria-hidden="true" />
        </span>
        <span class="text-center text-xs/4 font-medium text-accent-light">{{ options.length > quick.length ? `Más (${options.length - quick.length})` : 'Nueva' }}</span>
      </button>
    </div>
  </div>

  <!-- Todas las categorías -->
  <TpSheet v-if="showAll" :title="type === 'income' ? 'Categoría del ingreso' : 'Categoría del gasto'" @close="showAll = false">
    <label class="flex min-h-12 items-center gap-2 rounded-full border border-line bg-surface-200 px-4 text-ink-faint focus-within:border-primary [&_svg]:size-[18px] [&_svg]:shrink-0">
      <Search :stroke-width="1.75" aria-hidden="true" />
      <input ref="searchInput" v-model="query" type="search" placeholder="Buscar categoría" class="min-w-0 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-faint focus:outline-none" />
    </label>

    <div v-if="filtered.length" class="grid grid-cols-4 gap-2 sm:grid-cols-5">
      <button
        v-for="cat in filtered"
        :key="cat.id"
        type="button"
        :class="tile(cat.id === modelValue)"
        @click="pick(cat.id)"
      >
        <span class="grid size-11 place-items-center rounded-full [&_svg]:size-5" :style="iconStyle(cat.color, cat.id === modelValue)">
          <component :is="categoryIcon(cat)" :stroke-width="1.75" aria-hidden="true" />
        </span>
        <span class="line-clamp-2 w-full text-center text-xs/4 font-medium hyphens-auto">{{ cat.name }}</span>
      </button>
    </div>
    <p v-else class="m-0 text-center text-sm text-ink-faint">No hay categorías con "{{ query }}".</p>

    <!-- Crear -->
    <div class="flex flex-col gap-2 rounded-card border border-line bg-surface-200/40 p-4">
      <span class="text-sm font-semibold">Crear categoría</span>
      <div class="flex gap-2">
        <input
          v-model="newName"
          class="min-h-12 w-full min-w-0 rounded-tile border border-line bg-surface-200 px-4 font-sans text-base text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
          :placeholder="query || 'Nombre de la categoría'"
          @keydown.enter.prevent="create"
        />
        <TpButton size="sm" :disabled="!(newName.trim() || query.trim()) || saving" @click="create">Crear</TpButton>
      </div>
      <small v-if="duplicate" class="text-xs text-ink-faint">Ya existe "{{ duplicate.name }}": se usará esa.</small>
    </div>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Check, LayoutGrid, Search } from 'lucide-vue-next'
import TpSheet from './TpSheet.vue'
import TpButton from './TpButton.vue'
import { categoryIcon } from './categoryIcons'
import { useFinanceStore } from '@/stores/finance'

const props = defineProps<{ modelValue: string; type: 'income' | 'expense' }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const store = useFinanceStore()

// Cuántas se muestran sin abrir "Más" (la última casilla es "Más")
const QUICK = 7

const tile = (on: boolean) =>
  [
    'flex min-h-[88px] min-w-0 cursor-pointer flex-col items-center justify-start gap-1.5 rounded-tile border px-1 pt-2.5 pb-2 transition-colors',
    on ? 'border-primary bg-primary-soft text-ink' : 'border-transparent text-ink-muted hover:bg-surface-200 hover:text-ink'
  ].join(' ')

// Fondo del ícono con el color de la categoría (suave), o el principal si está elegida
function iconStyle(color: string | undefined, on: boolean) {
  const c = color || '#5f7fe8'
  return on ? { background: 'var(--color-primary)', color: '#fff' } : { background: `${c}26`, color: c }
}

// Las más usadas primero; la elegida siempre se ve
const options = computed(() => {
  const uses = new Map<string, number>()
  store.transactions.forEach(t => uses.set(t.category, (uses.get(t.category) || 0) + 1))
  return store.categories
    .filter(c => c.id !== 'transfer' && (c.type === props.type || c.type === 'both'))
    .sort((a, b) => (uses.get(b.id) || 0) - (uses.get(a.id) || 0) || a.name.localeCompare(b.name, 'es'))
})

const quick = computed(() => {
  const top = options.value.slice(0, QUICK)
  const selected = options.value.find(c => c.id === props.modelValue)
  if (selected && !top.includes(selected)) return [selected, ...top.slice(0, QUICK - 1)]
  return top
})

// ---------- Todas ----------
const showAll = ref(false)
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtered = computed(() => {
  const q = normalize(query.value.trim())
  return q ? options.value.filter(c => normalize(c.name).includes(q)) : options.value
})

async function openAll() {
  query.value = ''
  newName.value = ''
  showAll.value = true
  await nextTick()
  searchInput.value?.focus()
}

function pick(id: string) {
  emit('update:modelValue', id)
  showAll.value = false
}

// ---------- Crear ----------
const newName = ref('')
const saving = ref(false)

const duplicate = computed(() => {
  const key = normalize((newName.value || query.value).trim())
  return key ? store.categories.find(c => normalize(c.name.trim()) === key) : undefined
})

async function create() {
  const name = (newName.value || query.value).trim()
  if (!name || saving.value) return
  saving.value = true
  try {
    const id = await store.addCategory({ name, icon: '🏷️', color: '#5f7fe8', type: props.type })
    if (id) pick(id)
  } finally {
    saving.value = false
  }
}
</script>
