// Catálogo propio de bancos y billeteras de Colombia.
//
// Cada banco tiene un distintivo propio (sus iniciales sobre su color) y el color
// con el que brilla su tarjeta. No se usan los logos oficiales: son marcas
// registradas y la app es comercial (para usarlos hace falta permiso del banco o
// un servicio con licencia).
//
// Colores: `verified: true` = color publicado por la marca (consultado en
// Brandfetch, nov 2026). El resto son aproximados: confirmarlos con la guía de
// marca de cada banco antes de lanzar.

export interface Bank {
  id: string
  name: string
  // Lo que va en el distintivo (1 a 4 letras)
  mark: string
  // Color del distintivo y del brillo de la tarjeta
  color: string
  // Color del texto sobre `color`
  ink: string
  // Para reconocer el banco en el nombre de una cuenta ya creada
  match: RegExp
  verified?: boolean
}

export const banks: Bank[] = [
  { id: 'bancolombia', name: 'Bancolombia', mark: 'B', color: '#FDDA24', ink: '#2C2A29', match: /bancolombia/i, verified: true },
  { id: 'nu', name: 'Nu', mark: 'Nu', color: '#820AD1', ink: '#FFFFFF', match: /\bnu\b|nubank/i },
  { id: 'davivienda', name: 'Davivienda', mark: 'D', color: '#E30518', ink: '#FFFFFF', match: /davivienda/i, verified: true },
  { id: 'nequi', name: 'Nequi', mark: 'N', color: '#DA0081', ink: '#FFFFFF', match: /nequi/i },
  { id: 'daviplata', name: 'Daviplata', mark: 'DP', color: '#EE2737', ink: '#FFFFFF', match: /daviplata/i },
  { id: 'bbva', name: 'BBVA', mark: 'BBVA', color: '#004481', ink: '#FFFFFF', match: /bbva/i, verified: true },
  { id: 'bogota', name: 'Banco de Bogotá', mark: 'BdB', color: '#1B3C8C', ink: '#FFFFFF', match: /bogot[aá]/i },
  { id: 'occidente', name: 'Banco de Occidente', mark: 'BdO', color: '#0055A5', ink: '#FFFFFF', match: /occidente/i },
  { id: 'popular', name: 'Banco Popular', mark: 'BP', color: '#00843D', ink: '#FFFFFF', match: /popular/i },
  { id: 'avvillas', name: 'AV Villas', mark: 'AV', color: '#E4002B', ink: '#FFFFFF', match: /av ?villas/i },
  { id: 'davibank', name: 'Davibank (Scotiabank Colpatria)', mark: 'DB', color: '#ED1C27', ink: '#FFFFFF', match: /davibank|colpatria|scotiabank/i, verified: true },
  { id: 'itau', name: 'Itaú', mark: 'It', color: '#EC7000', ink: '#FFFFFF', match: /ita[uú]/i },
  { id: 'cajasocial', name: 'Banco Caja Social', mark: 'CS', color: '#005BAA', ink: '#FFFFFF', match: /caja social/i },
  { id: 'agrario', name: 'Banco Agrario', mark: 'BA', color: '#007A3D', ink: '#FFFFFF', match: /agrario/i },
  { id: 'falabella', name: 'Banco Falabella', mark: 'F', color: '#5A9E1B', ink: '#FFFFFF', match: /falabella|cmr/i },
  { id: 'lulo', name: 'Lulo Bank', mark: 'L', color: '#00C389', ink: '#0B1F1A', match: /lulo/i },
  { id: 'rappipay', name: 'RappiPay', mark: 'R', color: '#FF441F', ink: '#FFFFFF', match: /rappi/i },
  { id: 'addi', name: 'ADDI', mark: 'A', color: '#3D5AFE', ink: '#FFFFFF', match: /\baddi\b/i },
  { id: 'cash', name: 'Efectivo', mark: '$', color: '#2F9E6B', ink: '#FFFFFF', match: /efectivo|cash/i }
]

// "Otro" o sin banco: el azul de la app
export const otherBank: Bank = { id: '', name: 'Otro', mark: '', color: '#4F6FDC', ink: '#FFFFFF', match: /$^/ }

export const bankById = (id?: string) => banks.find(b => b.id === id)

// Banco de una cuenta: el que se eligió, o el que se reconoce en su nombre
export function bankOf(account?: { bank?: string; name?: string; type?: string }): Bank | undefined {
  if (!account) return undefined
  if (account.bank) return bankById(account.bank)
  if (account.type === 'cash') return bankById('cash')
  return banks.find(b => b.match.test(account.name || ''))
}
