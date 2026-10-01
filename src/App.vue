<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()

// Carga inicial: categorías, quincenas y gastos automáticos pendientes
onMounted(() => {
  store.initApp()
})
</script>
