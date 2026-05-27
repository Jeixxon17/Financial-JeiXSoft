<template>
  <div class="app-shell">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-text">Financial JeixSoft</span> 
        </div>
        <button class="sidebar-close" @click="sidebarOpen = false">✕</button>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="route in navRoutes"
          :key="route.path"
          :to="route.path"
          class="nav-item"
          active-class="nav-item-active"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon">{{ route.meta?.icon }}</span>
          <span class="nav-label">{{ route.meta?.title }}</span>
          <span class="nav-indicator" />
        </router-link>
      </nav>

      <!-- Month selector -->
      <div class="month-selector">
        <p class="month-label">Período activo</p>
        <div class="month-control">
          <button @click="prevMonth">‹</button>
          <span>{{ formatMonth(store.selectedMonth) }}</span>
          <button @click="nextMonth" :disabled="store.selectedMonth >= currentMonth">›</button>
        </div>
      </div>

      <!-- Financial health -->
      <div class="health-widget">
        <div class="health-header">
          <span>Salud financiera</span>
          <span class="health-score" :class="healthClass">{{ store.financialHealth }}%</span>
        </div>
        <div class="health-bar">
          <div class="health-fill" :style="{ width: `${store.financialHealth}%` }" :class="healthClass" />
        </div>
        <p class="health-text">{{ healthText }}</p>
      </div>

      <p class="text-[10px] flex items-center justify-center my-2 text-[#4a566e]">&copy; 2026 JeixSoft. Todos los derechos reservados.</p>
    </aside>

    <!-- Main content -->
    <div class="main-area">
      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-btn" @click="sidebarOpen = true">
            <span /><span /><span />
          </button>
          <div class="page-title">
            <h1>{{ currentRoute?.meta?.title }}</h1>
            <p class="page-subtitle">{{ currentDate }}</p>
          </div>
        </div>

        <div class="topbar-right">
          <div class="balance-badge">
            <span class="balance-label">Balance total</span>
            <span class="balance-amount">{{ formatCurrency(store.totalBalance) }}</span>
          </div>
          <button class="add-btn" @click="showModal = true">
            <span>+</span>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <Transition name="slide" mode="out-in">
          <slot />
        </Transition>
      </main>
    </div>

    <!-- Add Transaction Modal -->
    <TransactionModal v-if="showModal" @close="showModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'
import { formatCurrency, formatMonth, getCurrentMonth } from '@/utils/formatters'
import TransactionModal from '@/components/modals/TransactionModal.vue'

const store = useFinanceStore()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)
const showModal = ref(false)
const currentMonth = getCurrentMonth()

const navRoutes = router.getRoutes().filter(r => r.meta?.title)
const currentRoute = computed(() => route)
const currentDate = computed(() => {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
})

const healthClass = computed(() => {
  const h = store.financialHealth
  if (h >= 70) return 'health-good'
  if (h >= 40) return 'health-medium'
  return 'health-bad'
})

const healthText = computed(() => {
  const h = store.financialHealth
  if (h >= 70) return 'Excelente manejo financiero'
  if (h >= 40) return 'Hay áreas por mejorar'
  return 'Atención requerida'
})

function prevMonth() {
  const [y, m] = store.selectedMonth.split('-').map(Number)
  const d = new Date(y, m - 2)
  store.selectedMonth = d.toISOString().slice(0, 7)
}

function nextMonth() {
  const [y, m] = store.selectedMonth.split('-').map(Number)
  const d = new Date(y, m)
  const next = d.toISOString().slice(0, 7)
  if (next <= currentMonth) store.selectedMonth = next
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
}

/* Sidebar */
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 50;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .sidebar {
    position: sticky;
    transform: none;
  }
}

.sidebar-open {
  transform: translateX(0) !important;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 40;
  backdrop-filter: blur(2px);
}

.sidebar-header {
  padding: 24px 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 22px;
  background: linear-gradient(135deg, var(--accent-green), var(--accent-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.sidebar-close {
  display: block;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

@media (min-width: 1024px) {
  .sidebar-close { display: none; }
}

.sidebar-nav {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item-active {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item-active .nav-icon {
  filter: none;
}

.nav-item-active .nav-indicator {
  position: absolute;
  right: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-green);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

/* Month selector */
.month-selector {
  margin: 0 12px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.month-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
}

.month-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.month-control button {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 8px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.month-control button:hover:not(:disabled) {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.month-control button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.month-control span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
  flex: 1;
  text-transform: capitalize;
}

/* Health widget */
.health-widget {
  margin: 12px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.health-score {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 14px;
}

.health-good { color: var(--accent-green) !important; }
.health-medium { color: var(--accent-amber) !important; }
.health-bad { color: var(--accent-red) !important; }

.health-bar {
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.health-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.8s ease;
}

.health-fill.health-good { background: var(--accent-green); }
.health-fill.health-medium { background: var(--accent-amber); }
.health-fill.health-bad { background: var(--accent-red); }

.health-text {
  font-size: 11px;
  color: var(--text-muted);
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(10, 13, 20, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-btn {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

@media (min-width: 1024px) {
  .menu-btn { display: none; }
}

.menu-btn span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text-secondary);
  border-radius: 1px;
}

.page-title h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
}

.page-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: capitalize;
  margin-top: 1px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.balance-badge {
  display: none;
  flex-direction: column;
  align-items: flex-end;
}

@media (min-width: 640px) {
  .balance-badge { display: flex; }
}

.balance-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-green);
}

.add-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-green), #00b377);
  border: none;
  color: #000;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 300;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 214, 143, 0.3);
}

.add-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 214, 143, 0.4);
}

.page-content {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .page-content { padding: 16px; }
}
</style>
