<template>
  <!-- Precio del plan Completo: un solo pago -->
  <div class="flex flex-col gap-0.5 rounded-card border border-primary bg-linear-135 from-primary-soft to-[#162147] px-[18px] py-4">
    <span class="text-[32px]/10 font-semibold tracking-[-0.5px] tabular-nums">{{ money(PLAN_PRICE) }}</span>
    <span class="text-[13px] font-medium text-accent-light">Pago único · para siempre</span>
    <span class="mt-1 text-xs text-ink-muted">Sin mensualidades ni renovaciones.</span>
  </div>
</template>

<script setup lang="ts">
import { money } from './format'
import { PLAN_PRICE } from '@/services/plan.service'
</script>
