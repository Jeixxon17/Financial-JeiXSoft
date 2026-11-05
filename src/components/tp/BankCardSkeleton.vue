<template>
  <!-- Tarjeta bancaria mientras cargan las cuentas: misma forma y espacios que la real -->
  <div class="flex flex-col gap-6 rounded-card border border-line bg-surface-100 p-5" aria-hidden="true">
    <span class="flex items-center justify-between">
      <TpSkeleton class="block h-[22px] w-32 rounded-chip" />
      <TpSkeleton class="block h-[26px] w-[70px] rounded-chip" />
    </span>
    <span class="flex items-center gap-4">
      <TpSkeleton class="block h-[22px] w-[30px] rounded-[5px]" />
      <TpSkeleton class="block h-5 w-36 rounded-chip" />
    </span>
    <span class="flex items-end justify-between">
      <span class="flex flex-col gap-1.5">
        <TpSkeleton class="block h-3 w-20 rounded-chip" />
        <TpSkeleton class="block h-4 w-24 rounded-chip" />
      </span>
      <span class="flex flex-col items-end gap-1.5">
        <TpSkeleton class="block h-3 w-16 rounded-chip" />
        <TpSkeleton class="block h-4 w-14 rounded-chip" />
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import TpSkeleton from './TpSkeleton.vue'
</script>
