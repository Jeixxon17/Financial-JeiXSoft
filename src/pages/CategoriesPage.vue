<template>
  <TpLayout>
    <!-- ===== Encabezado ===== -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-[1_1_220px]">
        <h1 :class="pageTitle">Categorías</h1>
        <p class="mt-0.5 text-[13px]/[18px] text-ink-muted lg:text-sm">Ordenan tus movimientos y los topes del presupuesto.</p>
      </div>
      <button type="button" :class="[iconBtn, 'border-primary bg-primary text-white lg:hidden']" aria-label="Nueva categoría" @click="openNew">
        <Plus :stroke-width="1.75" aria-hidden="true" />
      </button>
      <div class="hidden lg:block">
        <TpButton @click="openNew">
          <Plus :stroke-width="1.75" aria-hidden="true" />
          Nueva categoría
        </TpButton>
      </div>
    </div>

    <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-200 p-1 sm:max-w-md" role="tablist" aria-label="Tipo">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tab === t.value"
        class="min-h-10 cursor-pointer rounded-full text-sm font-medium transition-colors"
        :class="tab === t.value ? 'bg-ink text-on-inverse' : 'text-ink-muted hover:text-ink'"
        @click="tab = t.value"
      >
        {{ t.label }} <span class="text-xs opacity-70">{{ countOf(t.value) }}</span>
      </button>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
      <template v-if="!ready">
        <TpSkeleton v-for="n in 6" :key="n" class="block h-[70px] rounded-card" />
      </template>
      <template v-else>
        <button
          v-for="cat in visible"
          :key="cat.id"
          type="button"
          class="flex cursor-pointer items-center gap-3 rounded-card border border-line bg-surface-100 px-4 py-3.5 text-left transition-colors hover:border-primary"
          @click="openEdit(cat)"
        >
          <span class="grid grid-cols-[minmax(0,1fr)] size-10 shrink-0 place-items-center rounded-tile" :style="{ background: `${cat.color}26` }">
            <span class="size-3 rounded-full" :style="{ background: cat.color }" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <strong class="truncate text-[15px]/5 font-semibold">{{ cat.name }}</strong>
            <small class="truncate text-xs text-ink-faint">
              {{ usage(cat.id) }} {{ usage(cat.id) === 1 ? 'movimiento' : 'movimientos' }}<template v-if="capOf(cat.id)"> · tope {{ money(capOf(cat.id)) }}</template>
            </small>
          </span>
        </button>
        <button
          type="button"
          class="flex min-h-[70px] cursor-pointer items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong text-sm font-semibold text-accent-light transition-colors hover:border-accent-light [&_svg]:size-4"
          @click="openNew"
        >
          <Plus :stroke-width="2" aria-hidden="true" />
          Agregar categoría
        </button>
      </template>
    </div>
  </TpLayout>

  <TpSheet v-if="showSheet" :title="editing ? 'Editar categoría' : 'Nueva categoría'" @close="closeSheet">
    <label class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Nombre</span>
      <input v-model="form.name" :class="fieldInput" placeholder="Ej: Mercado" @keydown.enter="save" />
      <small v-if="duplicate" class="text-xs text-warning">Ya existe una categoría llamada "{{ duplicate.name }}".</small>
    </label>

    <div class="flex flex-col gap-1.5">
      <span :class="fieldLabel">Es para</span>
      <div class="grid grid-cols-3 gap-1 rounded-full bg-surface-200 p-1">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          class="min-h-10 cursor-pointer rounded-full text-sm font-medium"
          :class="form.type === t.value ? 'bg-ink text-on-inverse' : 'text-ink-muted'"
          @click="form.type = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span :class="fieldLabel">Color</span>
      <div class="flex flex-wrap gap-2.5">
        <button
          v-for="color in colors"
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

    <p v-if="editing && usage(editing.id) > 0" class="m-0 text-xs text-ink-faint">
      Tiene {{ usage(editing.id) }} movimientos: para eliminarla, primero cámbiales la categoría.
    </p>

    <template #footer>
      <TpButton v-if="editing" variant="danger" :disabled="usage(editing.id) > 0" @click="confirming = true">Eliminar</TpButton>
      <div class="hidden lg:block"><TpButton variant="ghost" @click="closeSheet">Cancelar</TpButton></div>
      <TpButton block class="lg:w-auto lg:min-w-40" :disabled="!isValid || isSaving" @click="save">{{ isSaving ? 'Guardando…' : 'Guardar' }}</TpButton>
    </template>
  </TpSheet>

  <TpConfirm
    v-if="confirming && editing"
    :title="`¿Eliminar la categoría ${editing.name}?`"
    text="No tiene movimientos. Si tiene un tope de gasto, también deja de contar."
    :busy="isSaving"
    @cancel="confirming = false"
    @confirm="remove"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import TpLayout from '@/layouts/TpLayout.vue'
import TpButton from '@/components/tp/TpButton.vue'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpConfirm from '@/components/tp/TpConfirm.vue'
import TpSkeleton from '@/components/tp/TpSkeleton.vue'
import { fieldInput, fieldLabel, money } from '@/components/tp/format'
import { useFinanceStore } from '@/stores/finance'
import type { Category } from '@/interfaces'

const store = useFinanceStore()
const ready = computed(() => store.loaded.categories && store.loaded.transactions)

const pageTitle = 'm-0 font-sans text-xl/[26px] font-semibold lg:text-[26px]/8 lg:tracking-[-0.3px]'
const iconBtn =
  'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-ink transition-colors hover:bg-surface-200 [&_svg]:size-[18px]'

onMounted(async () => {
  await Promise.all([store.loadCategories(), store.loadTransactions(), store.loadRecurringExpenses()])
})

// Colores que se ven bien sobre el fondo noche
const colors = ['#5f7fe8', '#b9cbff', '#7cc7ff', '#7ee6e6', '#4ade96', '#f5bd4f', '#ffb38a', '#ff9ac4', '#c5b4ff', '#a6b0c9']

const tabs: { value: Category['type']; label: string }[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'both', label: 'Ambos' }
]
const tab = ref<Category['type']>('expense')

const sorted = computed(() =>
  [...store.categories].filter(c => c.id !== 'transfer').sort((a, b) => a.name.localeCompare(b.name, 'es'))
)
const visible = computed(() => sorted.value.filter(c => c.type === tab.value))
const countOf = (type: Category['type']) => sorted.value.filter(c => c.type === type).length

const usage = (id: string) => store.categoryUsage(id)
// Tope de todos los meses de la categoría, si tiene
const capOf = (id: string) => store.budgets.find(b => b.categoryId === id && !b.month)?.amount || 0

// ---------- Formulario ----------
const showSheet = ref(false)
const isSaving = ref(false)
const confirming = ref(false)
const editing = ref<Category | null>(null)

const defaultForm = () => ({ name: '', type: tab.value as Category['type'], icon: '🏷️', color: '#5f7fe8' })
const form = reactive(defaultForm())

const duplicate = computed(() => {
  const key = form.name.trim().toLowerCase()
  if (!key) return undefined
  return store.categories.find(c => c.id !== editing.value?.id && c.name.trim().toLowerCase() === key)
})
const isValid = computed(() => !!form.name.trim() && !duplicate.value)

function openNew() {
  editing.value = null
  Object.assign(form, defaultForm())
  showSheet.value = true
}

function openEdit(cat: Category) {
  editing.value = cat
  Object.assign(form, { name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  confirming.value = false
  editing.value = null
}

async function save() {
  if (!isValid.value || isSaving.value) return
  isSaving.value = true
  try {
    const data = { ...form, name: form.name.trim() }
    if (editing.value) await store.updateCategory(editing.value.id, data)
    else await store.addCategory(data)
    closeSheet()
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!editing.value || usage(editing.value.id) > 0 || isSaving.value) return
  isSaving.value = true
  try {
    await store.deleteCategory(editing.value.id)
    closeSheet()
  } finally {
    isSaving.value = false
  }
}
</script>
