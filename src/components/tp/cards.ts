import type { Bank } from './banks'

// Lo que muestra una tarjeta bancaria de la v2 (Inicio, Cuentas)
export interface CardView {
  // Banco del catálogo: distintivo y color del brillo
  bank?: Bank
  id: string
  name: string
  // Chip de arriba: Crédito, Ahorros, Débito, Efectivo
  kind: string
  // Color del chip: vence pronto, vencido, al día
  tone?: 'success' | 'warning' | 'danger'
  // "•••• 1410" o vacío si no hay últimos dígitos
  number: string
  labelA: string
  valueA: string
  labelB: string
  valueB: string
  // Solo tarjetas con cupo: lo disponible, lo gastado y el % usado
  limit?: { available: string; used: string; total: string; pct: number }
  // Detalle (panel de escritorio)
  rows: { label: string; value: string }[]
}

// Contenedor de la tarjeta (azul noche, mancha de luz y brillo que cruza).
// Quien la usa pone la etiqueta (button, div), su tamaño y su posición
// (`relative` o `absolute`: el brillo necesita una de las dos).
export const bankCardClass =
  'shine flex flex-col gap-6 overflow-hidden rounded-card bg-bank-card p-5 text-left text-card-ink shadow-card'
