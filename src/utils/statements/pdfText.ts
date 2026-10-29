// Lee el texto de un PDF en el propio dispositivo (pdf.js). El archivo y la
// contraseña nunca salen del celular o del navegador.

export class PdfPasswordError extends Error {
  incorrect: boolean

  constructor(incorrect: boolean) {
    super(incorrect ? 'Contraseña incorrecta' : 'El PDF tiene contraseña')
    this.incorrect = incorrect
  }
}

interface TextItem {
  str: string
  transform: number[]
}

/** Renglones de cada página: textos con la misma altura unidos por " | ". */
export function groupLines(items: TextItem[]): string[] {
  const rows = new Map<number, { x: number; s: string }[]>()
  for (const item of items) {
    if (!item.str?.trim()) continue
    const y = Math.round(item.transform[5])
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y)!.push({ x: item.transform[4], s: item.str.trim() })
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cells]) => cells.sort((a, b) => a.x - b.x).map(c => c.s).join(' | '))
}

export async function extractPdfLines(data: ArrayBuffer, password?: string): Promise<string[][]> {
  // pdf.js pesa bastante: se carga solo cuando se sube un extracto
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(data), password }).promise
    const pages: string[][] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent()
      pages.push(groupLines(content.items as TextItem[]))
    }
    await doc.destroy()
    return pages
  } catch (error) {
    if ((error as { name?: string })?.name === 'PasswordException') {
      // code 1: necesita contraseña; 2: contraseña incorrecta
      throw new PdfPasswordError((error as { code?: number }).code === 2)
    }
    throw error
  }
}
