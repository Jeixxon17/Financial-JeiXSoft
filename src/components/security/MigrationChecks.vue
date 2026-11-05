<template>
  <!-- Resultado de la verificación de la migración: registros de la v1 y cuántos quedaron copiados -->
  <div class="flex flex-col divide-y divide-line rounded-tile border border-line bg-surface-200/40 px-4 text-[13px]">
    <div v-for="c in checks" :key="c.collection" class="flex items-center justify-between gap-3 py-2">
      <span class="text-ink-muted">{{ labels[c.collection] || c.collection }}</span>
      <span class="flex items-center gap-1.5 tabular-nums [&_svg]:size-4" :class="c.ok ? 'text-ink [&_svg]:text-success' : 'text-danger'">
        {{ c.copied }} de {{ c.original }}
        <component :is="c.ok ? CircleCheck : CircleAlert" :stroke-width="2" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import type { MigrationCheck } from '@/services/migration.service'

defineProps<{ checks: MigrationCheck[] }>()

const labels: Record<string, string> = {
  accounts: 'Cuentas y tarjetas',
  transactions: 'Movimientos',
  categories: 'Categorías',
  paychecks: 'Quincenas',
  recurringExpenses: 'Gastos automáticos',
  pendingTransactions: 'Por confirmar',
  budgets: 'Topes de gasto',
  savingsGoals: 'Metas de ahorro'
}
</script>
