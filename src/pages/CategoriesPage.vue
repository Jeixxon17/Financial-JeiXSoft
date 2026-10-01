<template>
  <AppLayout>
    <div class="categories-page">
      <div class="page-header">
        <p class="header-subtitle">Crea, edita y elimina tus categorías de gastos e ingresos</p>
        <button class="btn-add" @click="openNew">+ Nueva categoría</button>
      </div>

      <div v-for="group in groups" :key="group.type" class="group">
        <h3 class="group-title">{{ group.label }} <span>{{ group.items.length }}</span></h3>

        <div class="cat-grid">
          <div
            v-for="cat in group.items"
            :key="cat.id"
            class="cat-card"
            :style="{ '--cat-color': cat.color }"
          >
            <div class="cat-icon">{{ cat.icon }}</div>
            <div class="cat-info">
              <p class="cat-name">{{ cat.name }}</p>
              <p class="cat-usage">
                {{ usage(cat.id) }} {{ usage(cat.id) === 1 ? 'movimiento' : 'movimientos' }}
              </p>
            </div>
            <div class="cat-actions">
              <button class="icon-btn" @click="openEdit(cat)">✏️</button>
              <button
                class="icon-btn danger"
                :disabled="usage(cat.id) > 0"
                :title="usage(cat.id) > 0 ? 'Tiene movimientos: no se puede eliminar' : 'Eliminar'"
                @click="remove(cat)"
              >🗑️</button>
            </div>
          </div>

          <p v-if="!group.items.length" class="empty">Sin categorías</p>
        </div>
      </div>
    </div>
  </AppLayout>

  <Teleport to="body" v-if="showModal">
    <div class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar categoría' : 'Nueva categoría' }}</h2>
          <button @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nombre *</label>
              <input v-model="form.name" type="text" placeholder="Ej: Mercado" @keydown.enter="save" />
              <small v-if="duplicate" class="hint">Ya existe una categoría llamada “{{ duplicate.name }}”.</small>
            </div>

            <div class="form-group full">
              <label>Tipo</label>
              <select v-model="form.type">
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
                <option value="both">Ambos</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Icono</label>
              <div class="icon-picker">
                <button
                  v-for="icon in icons"
                  :key="icon"
                  type="button"
                  class="icon-opt"
                  :class="{ selected: form.icon === icon }"
                  @click="form.icon = icon"
                >{{ icon }}</button>
              </div>
            </div>

            <div class="form-group full">
              <label>Color</label>
              <div class="color-picker">
                <button
                  v-for="color in colors"
                  :key="color"
                  type="button"
                  class="color-opt"
                  :style="{ background: color }"
                  :class="{ selected: form.color === color }"
                  @click="form.color = color"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button class="btn-save" :disabled="!isValid || isSaving" @click="save">
            {{ isSaving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Category } from '@/interfaces'

const store = useFinanceStore()

onMounted(async () => {
  await Promise.all([store.loadCategories(), store.loadTransactions(), store.loadRecurringExpenses()])
})

const icons = ['🍔', '🛒', '🚗', '🏍️', '🅿️', '🏠', '💡', '📱', '🎮', '🎬', '🏥', '📚', '👕', '👟', '✈️', '🐶', '💳', '💼', '🧑‍💻', '💰', '🎁', '📦']
const colors = ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#eab308', '#6b7280']

const showModal = ref(false)
const isSaving = ref(false)
const editing = ref<Category | null>(null)

const defaultForm = () => ({
  name: '',
  type: 'expense' as Category['type'],
  icon: '📦',
  color: '#6366f1'
})

const form = reactive(defaultForm())

const sorted = computed(() =>
  [...store.categories].sort((a, b) => a.name.localeCompare(b.name, 'es'))
)

const groups = computed(() => [
  { type: 'expense', label: 'Gastos', items: sorted.value.filter(c => c.type === 'expense') },
  { type: 'income', label: 'Ingresos', items: sorted.value.filter(c => c.type === 'income') },
  { type: 'both', label: 'Gastos e ingresos', items: sorted.value.filter(c => c.type === 'both') }
].filter(g => g.items.length || g.type !== 'both'))

const duplicate = computed(() => {
  const key = form.name.trim().toLowerCase()
  if (!key) return undefined
  return store.categories.find(c =>
    c.id !== editing.value?.id && c.name.trim().toLowerCase() === key
  )
})

const isValid = computed(() => form.name.trim() && !duplicate.value)

function usage(id: string) {
  return store.categoryUsage(id)
}

function openNew() {
  editing.value = null
  Object.assign(form, defaultForm())
  showModal.value = true
}

function openEdit(cat: Category) {
  editing.value = cat
  Object.assign(form, { name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function save() {
  if (!isValid.value || isSaving.value) return
  isSaving.value = true

  try {
    const data = { ...form, name: form.name.trim() }

    if (editing.value) {
      await store.updateCategory(editing.value.id, data)
    } else {
      await store.addCategory(data)
    }

    closeModal()
  } finally {
    isSaving.value = false
  }
}

async function remove(cat: Category) {
  if (usage(cat.id) > 0) return
  if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return
  await store.deleteCategory(cat.id)
}
</script>

<style scoped>
.categories-page { display: flex; flex-direction: column; gap: 24px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-subtitle { font-size: 13px; color: var(--text-muted); }

.btn-add {
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  color: #000;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 4px 12px rgba(0,214,143,0.25);
}

.group { display: flex; flex-direction: column; gap: 10px; }

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-title span {
  font-size: 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1px 8px;
  color: var(--text-muted);
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.cat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--cat-color);
  border-radius: 12px;
  padding: 12px 14px;
}

.cat-icon {
  font-size: 20px;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: 10px;
}

.cat-info { flex: 1; min-width: 0; }
.cat-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-usage { font-size: 11px; color: var(--text-muted); }

.cat-actions { display: flex; gap: 6px; }

.icon-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) { border-color: var(--accent-blue); }
.icon-btn.danger:hover:not(:disabled) { border-color: var(--accent-red); }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.empty { font-size: 13px; color: var(--text-muted); }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  animation: fadeInUp 0.3s ease;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.modal-header button {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 32px; height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
}

.modal-body { padding: 24px; }

.form-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.form-group input, .form-group select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
}

.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-green); }

.hint { font-size: 11px; color: var(--accent-amber); }

.icon-picker, .color-picker { display: flex; flex-wrap: wrap; gap: 6px; }

.icon-opt {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-opt.selected, .icon-opt:hover { border-color: var(--accent-green); background: var(--accent-green-dim); }

.color-opt {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-opt.selected { border-color: white; transform: scale(1.15); }

.modal-footer { padding: 0 24px 24px; display: flex; gap: 10px; justify-content: flex-end; }

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

option { background: var(--bg-elevated); }
</style>
