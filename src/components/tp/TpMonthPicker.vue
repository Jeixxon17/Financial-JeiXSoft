<template>
  <!-- Mes que se está viendo (store.selectedMonth): no deja pasar del mes actual -->
  <div class="inline-flex items-center gap-1 rounded-full border border-line bg-surface-100 p-1">
    <button type="button" :class="arrow" aria-label="Mes anterior" @click="move(-1)">
      <ChevronLeft :stroke-width="1.75" aria-hidden="true" />
    </button>
    <span class="min-w-32 px-1 text-center text-sm font-semibold">{{ label }}</span>
    <button type="button" :class="arrow" aria-label="Mes siguiente" :disabled="store.selectedMonth >= current" @click="move(1)">
      <ChevronRight :stroke-width="1.75" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useFinanceStore } from '@/stores/finance'
import { getCurrentMonth } from '@/utils/formatters'

const store = useFinanceStore()
const current = getCurrentMonth()

const arrow =
  'grid size-8 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-200 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent [&_svg]:size-4'

const label = computed(() => {
  const [y, m] = store.selectedMonth.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

function move(delta: number) {
  const [y, m] = store.selectedMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (next <= current) store.selectedMonth = next
}
</script>
