<template>
  <!-- Mientras Firebase dice si hay sesión: fondo de la app con el ícono latiendo -->
  <div v-if="!authState.ready" class="grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center bg-screen" aria-busy="true" aria-label="Cargando">
    <img :src="appIcon" alt="" width="76" height="76" class="size-[76px] animate-pulse rounded-card shadow-icon" />
  </div>
  <!-- Sin sesión: bienvenida, iniciar sesión, crear cuenta -->
  <AuthScreen v-else-if="!authState.signedIn" />
  <!-- Con sesión pero bloqueada: crear el PIN o escribirlo -->
  <PinScreen v-else-if="!authState.unlocked || authState.resettingPin" :key="authState.uid" />
  <template v-else>
    <router-view v-slot="{ Component, route }">
      <!-- Secciones del plan Completo con el plan Gratis: se ven bloqueadas -->
      <PlanLockedPage v-if="route.meta.pro && !hasFullPlan" :key="route.path" :feature="route.meta.pro as ProFeature" :title="route.meta.title as string" />
      <component :is="Component" v-else />
    </router-view>
    <AdvisorToast v-if="hasFullPlan" />
    <PlanUpgradeSheet v-if="planUi.open" />
  </template>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AuthScreen from '@/components/security/AuthScreen.vue'
import PinScreen from '@/components/security/PinScreen.vue'
import AdvisorToast from '@/components/AdvisorToast.vue'
import PlanUpgradeSheet from '@/components/tp/PlanUpgradeSheet.vue'
import PlanLockedPage from '@/pages/PlanLockedPage.vue'
import { hasFullPlan, planUi, type ProFeature } from '@/services/plan.service'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'
import { authState, initAuth, lockApp } from '@/services/auth.service'
import { flushNotifications, watchNotificationSession } from '@/services/notificationListener'

const store = useFinanceStore()

// Si la app queda en segundo plano más de este tiempo, se vuelve a pedir el PIN
const AUTO_LOCK_MS = 5 * 60 * 1000
let hiddenAt = 0
let loadedFor = ''

// Carga inicial (categorías, quincenas y gastos automáticos pendientes) la primera
// vez que se desbloquea cada usuario: las reglas de Firestore exigen la sesión
watch(
  () => authState.unlocked,
  unlocked => {
    if (!unlocked || loadedFor === authState.uid) return
    loadedFor = authState.uid
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
