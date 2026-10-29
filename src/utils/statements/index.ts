import { isNuStatement, parseNuStatement } from './nuStatement'
import type { ParsedStatement } from './types'

export * from './types'
export { extractPdfLines, PdfPasswordError } from './pdfText'

/** Detecta el banco del extracto y lo interpreta. */
export function parseStatement(pages: string[][]): ParsedStatement {
  const text = pages.flat().join('\n')

  if (isNuStatement(text)) return parseNuStatement(pages)

  if (/bancolombia/i.test(text)) {
    throw new Error('Los extractos de Bancolombia aún no se pueden leer. Envíame uno y lo agrego.')
  }
  throw new Error('No se reconoce el banco de este extracto.')
}
