<template>
  <div v-if="!authState.ready" class="app-boot" />
  <PinScreen v-else-if="!authState.unlocked" />
  <template v-else>
    <router-view />
    <AdvisorToast />
  </template>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import PinScreen from '@/components/security/PinScreen.vue'
import AdvisorToast from '@/components/AdvisorToast.vue'
import { authState, initAuth, lockApp } from '@/services/auth.service'
import { flushNotifications, watchNotificationSession } from '@/services/notificationListener'

const store = useFinanceStore()

// Si la app queda en segundo plano más de este tiempo, se vuelve a pedir el PIN
const AUTO_LOCK_MS = 5 * 60 * 1000
let hiddenAt = 0

// Carga inicial (categorías, quincenas y gastos automáticos pendientes),
// solo después de ingresar el PIN: las reglas de Firestore lo exigen
watch(
  () => authState.unlocked,
  unlocked => {
    if (!unlocked) return
    store.initApp()
  }
)

function onVisibilityChange() {
  if (document.hidden) {
    hiddenAt = Date.now()
  } else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS && authState.unlocked) {
    lockApp()
  } else if (authState.unlocked) {
    // Al volver a la app: sube lo pendiente del celular y trae "Por confirmar"
    flushNotifications()
    store.loadPendingTransactions()
  }
}

onMounted(() => {
  initAuth()
  // App Android: el lector nativo sube las notificaciones de los bancos solo
  watchNotificationSession()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.app-boot {
  min-height: 100vh;
  background: var(--bg-base);
}
</style>
