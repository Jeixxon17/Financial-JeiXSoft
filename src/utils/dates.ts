// Utilidades de fechas en hora local (YYYY-MM-DD).
// Evitan toISOString(), que usa UTC y en Colombia cambia de día después de las 7pm.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(s: string, days: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// Fecha con el día ajustado al último día del mes (ej: día 31 en febrero → 28/29)
export function dateInMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(day, lastDay))
}

export function monthIndexOf(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth()
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
