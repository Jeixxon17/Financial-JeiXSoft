import { parseISO, shortDate } from './format'
import { todayISO } from '@/utils/dates'
import type { SpendingEvent } from '@/interfaces'

const DAY = 86_400_000

// "3 nov – hoy", "3 nov – 9 nov"
export function eventRange(e: SpendingEvent): string {
  const start = shortDate(parseISO(e.startDate))
  if (!e.endDate) return `Desde el ${start}`
  if (e.endDate === e.startDate) return start
  return `${start} – ${shortDate(parseISO(e.endDate))}`
}

// Días que lleva (o duró) el evento, contando el primero y el último. 0 si aún no empieza
export function eventDays(e: SpendingEvent): number {
  const today = todayISO()
  if (e.startDate > today) return 0
  const end = e.endDate && e.endDate < today ? e.endDate : today
  return Math.round((parseISO(end).getTime() - parseISO(e.startDate).getTime()) / DAY) + 1
}
