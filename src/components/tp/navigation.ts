import type { Component } from 'vue'
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesColumn,
  ChartPie,
  CircleUser,
  CreditCard,
  House,
  Inbox,
  MapPin,
  Repeat,
  Tags
} from 'lucide-vue-next'

export interface NavLink {
  to: string
  label: string
  short: string
  icon: Component
  // Pide el plan Completo (se ve con candado en el plan Gratis)
  pro?: boolean
}

// Las 5 secciones de la navegación inferior (celular) y del menú lateral (escritorio)
export const mainLinks: NavLink[] = [
  { to: '/dashboard', label: 'Inicio', short: 'Inicio', icon: House },
  { to: '/transactions', label: 'Movimientos', short: 'Movimientos', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Cuentas y tarjetas', short: 'Cuentas', icon: CreditCard },
  { to: '/budgets', label: 'Presupuesto y ahorro', short: 'Presupuesto', icon: ChartNoAxesColumn, pro: true },
  { to: '/inbox', label: 'Por confirmar', short: 'Por confirmar', icon: Inbox, pro: true }
]

// "Más": en escritorio va en el menú lateral, en el celular en una hoja
export const moreLinks: NavLink[] = [
  { to: '/analytics', label: 'Estadísticas', short: 'Estadísticas', icon: ChartPie, pro: true },
  { to: '/events', label: 'Viajes y eventos', short: 'Viajes', icon: MapPin, pro: true },
  { to: '/paychecks', label: 'Quincenas', short: 'Quincenas', icon: CalendarDays },
  { to: '/recurring', label: 'Gastos automáticos', short: 'Automáticos', icon: Repeat, pro: true },
  { to: '/categories', label: 'Categorías', short: 'Categorías', icon: Tags },
  { to: '/profile', label: 'Perfil y ajustes', short: 'Perfil', icon: CircleUser }
]
