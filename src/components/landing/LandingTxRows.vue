<template>
  <!-- Filas de movimientos de ejemplo dentro de los celulares de la landing -->
  <div class="flex flex-col divide-y divide-line rounded-tile border border-line bg-surface-100 px-3">
    <div v-for="r in rows" :key="r.name" class="flex items-center gap-2.5 py-2">
      <BankBadge :bank="bankById(r.bank)" :size="24" />
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-[12px] font-semibold">{{ r.name }}</span>
        <span class="truncate text-[10px] text-ink-faint">{{ r.note }}</span>
      </span>
      <span class="text-[12px] font-semibold tabular-nums" :class="r.income ? 'text-success' : 'text-ink'">{{ r.amount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import BankBadge from '@/components/tp/BankBadge.vue'
import { bankById } from '@/components/tp/banks'

defineProps<{ rows: { name: string; note: string; amount: string; bank: string; income?: boolean }[] }>()
</script>
