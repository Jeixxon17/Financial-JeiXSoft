import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Las pantallas de la v2 (TuPlataAlDia). La navegación está en components/tp/navigation.ts.
// `pro`: la sección pide el plan Completo (App.vue muestra PlanLockedPage con el plan Gratis)
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: 'Inicio' } },
  { path: '/transactions', name: 'Transactions', component: () => import('@/pages/TransactionsPage.vue'), meta: { title: 'Movimientos' } },
  { path: '/inbox', name: 'Inbox', component: () => import('@/pages/InboxPage.vue'), meta: { title: 'Por confirmar', pro: 'inbox' } },
  { path: '/accounts', name: 'Accounts', component: () => import('@/pages/AccountsPage.vue'), meta: { title: 'Cuentas y tarjetas' } },
  { path: '/recurring', name: 'Recurring', component: () => import('@/pages/RecurringPage.vue'), meta: { title: 'Gastos automáticos', pro: 'recurring' } },
  { path: '/categories', name: 'Categories', component: () => import('@/pages/CategoriesPage.vue'), meta: { title: 'Categorías' } },
  { path: '/paychecks', name: 'Paychecks', component: () => import('@/pages/PaychecksPage.vue'), meta: { title: 'Quincenas' } },
  { path: '/budgets', name: 'Budgets', component: () => import('@/pages/BudgetsPage.vue'), meta: { title: 'Presupuesto y ahorro', pro: 'budgets' } },
  { path: '/analytics', name: 'Analytics', component: () => import('@/pages/AnalyticsPage.vue'), meta: { title: 'Estadísticas', pro: 'analytics' } },
  { path: '/profile', name: 'Profile', component: () => import('@/pages/ProfilePage.vue'), meta: { title: 'Perfil y ajustes' } },
  // Aquí vuelve Wompi después de pagar el plan Completo
  { path: '/plan', name: 'Plan', component: () => import('@/pages/PlanResultPage.vue'), meta: { title: 'Plan Completo' } },
  // Cualquier dirección vieja o mal escrita vuelve al Inicio
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // Cada pantalla empieza arriba
  scrollBehavior: () => ({ top: 0 })
})

// Título de la pestaña
router.afterEach(to => {
  const title = to.meta?.title as string | undefined
  document.title = title ? `${title} · TuPlataAlDia` : 'TuPlataAlDia'
})
