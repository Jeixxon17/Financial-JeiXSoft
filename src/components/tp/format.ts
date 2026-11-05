import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-vue-next'
import type { Transaction } from '@/interfaces'

// Formatos de la v2: pesos sin decimales y con punto de miles ($ 1.578.005)
const pesos = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export const plain = (n: number) => pesos.format(Math.abs(Math.round(n)))
// Espacio que no se parte: el "$" nunca queda solo en una línea
export const money = (n: number) => `${n < 0 ? '−' : ''}$\u00a0${plain(n)}`

export const parseISO = (iso: string) => new Date(iso + 'T00:00:00')

// "3 nov" (es-CO da "3 de nov.")
export const shortDate = (d: Date) =>
  d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ')

// "3 nov 2026"
export const mediumDate = (d: Date) => `${shortDate(d)} ${d.getFullYear()}`

// "Lunes, 3 de noviembre" (título de cada día en Movimientos)
export function dayTitle(iso: string): string {
  const s = parseISO(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Las transferencias se guardan como un gasto y un ingreso con categoría "transfer"
export const isTransfer = (tx: Pick<Transaction, 'category'>) => tx.category === 'transfer'

// Monto con signo: gastos con −, ingresos con +, transferencias sin signo
export function signedAmount(tx: Pick<Transaction, 'type' | 'amount' | 'category'>): string {
  if (isTransfer(tx) || tx.type === 'transfer') return plain(tx.amount)
  return `${tx.type === 'income' ? '+' : '−'}${plain(tx.amount)}`
}

export function txIcon(tx: Pick<Transaction, 'type' | 'category'>) {
  if (isTransfer(tx) || tx.type === 'transfer') return ArrowLeftRight
  return tx.type === 'income' ? ArrowDownLeft : ArrowUpRight
}

export const txTypeLabel = (tx: Pick<Transaction, 'type' | 'category'>) =>
  isTransfer(tx) || tx.type === 'transfer' ? 'Transferencia' : tx.type === 'income' ? 'Ingreso' : 'Gasto'

// Clases de formulario que se repiten
export const fieldLabel = 'text-[13px]/[18px] font-medium text-ink-muted'
export const fieldInput =
  'min-h-12 w-full rounded-tile border border-line bg-surface-200 px-4 font-sans text-base text-ink [color-scheme:dark] ' +
  'placeholder:text-ink-faint focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] focus:outline-none ' +
  'disabled:opacity-50 [&>option]:bg-surface-200'
