<template>
  <!-- Contenido de la tarjeta; el contenedor (bankCardClass) lo pone quien la usa -->

  <!-- Mancha de luz con el color del banco (va detrás del contenido) -->
  <span class="pointer-events-none absolute inset-0" :style="{ background: glow }" aria-hidden="true" />

  <span class="relative flex items-center justify-between gap-2">
    <span class="flex min-w-0 items-center gap-2.5">
      <BankBadge :bank="card.bank" :size="30" />
      <span class="min-w-0 truncate pr-1 text-[22px] leading-none font-bold tracking-[0.5px] italic">{{ card.name }}</span>
    </span>
    <span
      class="inline-flex shrink-0 items-center rounded-chip border border-line bg-primary-soft px-3 py-[5px] text-xs font-semibold"
      :class="card.tone === 'success' ? 'text-success' : card.tone === 'warning' ? 'text-warning' : card.tone === 'danger' ? 'text-danger' : 'text-ink'"
    >
      {{ card.kind }}
    </span>
  </span>

  <span class="relative flex items-center gap-4">
    <span class="h-[22px] w-[30px] rounded-[5px] bg-chip-gold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" />
    <Nfc :size="20" :stroke-width="1.75" aria-hidden="true" />
    <span class="text-lg/6 font-medium tracking-[1.5px] tabular-nums">{{ card.number }}</span>
  </span>

  <!-- Cupo: disponible, gastado y barra de uso -->
  <span v-if="card.limit" class="relative -mt-2 flex flex-col gap-1.5">
    <span class="flex items-baseline justify-between gap-2">
      <span class="text-[11px]/[14px] text-card-ink-muted">Cupo disponible</span>
      <span class="text-right text-[11px]/[14px] text-card-ink-muted">Usado {{ card.limit.used }} de {{ card.limit.total }}</span>
    </span>
    <span class="text-xl/6 font-semibold tabular-nums">{{ card.limit.available }}</span>
    <span class="block h-1.5 overflow-hidden rounded-full bg-white/15">
      <span
        class="block h-full rounded-full"
        :class="card.limit.pct >= 90 ? 'bg-danger' : card.limit.pct >= 70 ? 'bg-warning' : 'bg-accent-light'"
        :style="{ width: `${Math.min(100, card.limit.pct)}%` }"
      />
    </span>
  </span>

  <span class="relative flex items-end justify-between">
    <span class="block text-left">
      <span class="block text-[11px]/[14px] text-card-ink-muted">{{ card.labelA }}</span>
      <span class="mt-0.5 block text-[13px]/[18px] font-medium tabular-nums">{{ card.valueA }}</span>
    </span>
    <span class="block text-right">
      <span class="block text-[11px]/[14px] text-card-ink-muted">{{ card.labelB }}</span>
      <span class="mt-0.5 block text-[13px]/[18px] font-medium tabular-nums">{{ card.valueB }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Nfc } from 'lucide-vue-next'
import BankBadge from './BankBadge.vue'
import type { CardView } from './cards'

const props = defineProps<{ card: CardView }>()

// Tinte del color del banco: sale suave de la esquina de abajo a la derecha y se
// desvanece en diagonal, sin formar un círculo marcado
const glow = computed(() => {
  const color = props.card.bank?.color || 'var(--color-accent-glow)'
  const soft = (pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`
  return [
    `radial-gradient(120% 140% at 110% 120%, ${soft(38)} 0%, ${soft(14)} 45%, transparent 75%)`,
    `linear-gradient(135deg, transparent 40%, ${soft(10)} 100%)`
  ].join(', ')
})
</script>
