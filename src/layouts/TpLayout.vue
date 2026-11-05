<template>
  <!-- Estructura de la v2: menú lateral en escritorio, navegación flotante en el celular -->
  <div class="flex min-h-dvh bg-screen font-sans text-ink antialiased lg:bg-desk">
    <TpSide :pending="pending" />
    <main
      class="flex min-w-0 flex-1 flex-col px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-[calc(112px+env(safe-area-inset-bottom))] lg:px-8 lg:pt-7 lg:pb-10"
    >
      <div class="mx-auto flex w-full max-w-[560px] flex-col gap-[18px] lg:mx-0 lg:max-w-[1240px] lg:gap-6">
        <slot />
      </div>
    </main>
    <TpNav :pending="pending" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TpNav from '@/components/tp/TpNav.vue'
import TpSide from '@/components/tp/TpSide.vue'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const pending = computed(() => store.pendingTransactions.length)
</script>
