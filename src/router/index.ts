import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: 'Dashboard', icon: '📊' } },
  { path: '/transactions', name: 'Transactions', component: () => import('@/pages/TransactionsPage.vue'), meta: { title: 'Movimientos', icon: '↕️' } },
  { path: '/inbox', name: 'Inbox', component: () => import('@/pages/InboxPage.vue'), meta: { title: 'Por confirmar', icon: '📥' } },
  { path: '/accounts', name: 'Accounts', component: () => import('@/pages/AccountsPage.vue'), meta: { title: 'Cuentas', icon: '🏦' } },
  { path: '/recurring', name: 'Recurring', component: () => import('@/pages/RecurringPage.vue'), meta: { title: 'Gastos automáticos', icon: '🔁' } },
  { path: '/categories', name: 'Categories', component: () => import('@/pages/CategoriesPage.vue'), meta: { title: 'Categorías', icon: '🏷️' } },
  { path: '/paychecks', name: 'Paychecks', component: () => import('@/pages/PaychecksPage.vue'), meta: { title: 'Quincenas', icon: '💸' } },
  { path: '/budgets', name: 'Budgets', component: () => import('@/pages/BudgetsPage.vue'), meta: { title: 'Presupuestos', icon: '🎯' } },
  { path: '/analytics', name: 'Analytics', component: () => import('@/pages/AnalyticsPage.vue'), meta: { title: 'Estadísticas', icon: '📈' } }
]

export const router = createRouter({ history: createWebHashHistory(), routes })
