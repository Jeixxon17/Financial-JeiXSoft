// TRM (tasa representativa del mercado) oficial de Colombia, de datos.gov.co
// (gratis, sin clave). NU convierte los cobros en dólares con la TRM vigente
// el día anterior al cobro, sin margen; la comisión por cambio va aparte.

const TRM_API = 'https://www.datos.gov.co/resource/32sa-8pi3.json'
const CACHE_KEY = 'jx-trm-cache'

type TrmCache = Record<string, number>

function readCache(): TrmCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeCache(cache: TrmCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Sin almacenamiento: se vuelve a consultar la próxima vez
  }
}

/**
 * TRM vigente el día anterior a `dateISO` (YYYY-MM-DD).
 * Sin internet usa la última TRM conocida; null si nunca se ha consultado.
 */
export async function trmForCharge(dateISO: string): Promise<number | null> {
  const cache = readCache()
  if (cache[dateISO]) return cache[dateISO]

  try {
    const where = encodeURIComponent(`vigenciadesde < '${dateISO}T00:00:00.000'`)
    const response = await fetch(`${TRM_API}?$where=${where}&$order=vigenciadesde%20DESC&$limit=1`)
    const [row] = await response.json()
    const value = Number(row?.valor)
    if (!value) throw new Error('TRM vacía')

    cache[dateISO] = value
    cache.latest = value
    writeCache(cache)
    return value
  } catch {
    return cache.latest || null
  }
}

// Pesos con centavos (como los cobra el banco)
export function usdToCop(usd: number, trm: number): number {
  return Math.round(usd * trm * 100) / 100
}

export function fxFee(amount: number, ratePct: number): number {
  return Math.round(amount * ratePct) / 100
}
