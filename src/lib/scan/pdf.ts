import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

import { ReaderLoadError } from './errors'
import { toCanvas } from './image'

/**
 * PDFs, read on the phone with pdf.js.
 *
 * Loaded only when somebody opens or scans a PDF — the library and its worker
 * are about 2 MB, and nothing else in the app needs them.
 *
 * The legacy build is used on purpose: it carries its own polyfills, so it
 * runs on the older Android WebViews a finance app's users are likely to have,
 * not only on the newest Chrome.
 */

/**
 * A digital PDF's text comes out in milliseconds a page, so the whole document
 * is read — a bank statement's last transactions are on its last page. The cap
 * only guards against a 500-page annual report picked by mistake.
 */
export const MAX_TEXT_PAGES = 50

export class PdfPasswordError extends Error {
  constructor(readonly wrongPassword: boolean) {
    super(wrongPassword ? 'Wrong password.' : 'This PDF is password-protected.')
  }
}

async function pdfjs() {
  try {
    const [library, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ])
    library.GlobalWorkerOptions.workerSrc = worker.default
    return library
  } catch (error) {
    throw new ReaderLoadError('PDF reader', error)
  }
}

/** An open PDF, and the way to let go of it (its worker and its memory). */
export type OpenPdf = { pdf: PDFDocumentProxy; close: () => void }

export async function openPdf(blob: Blob, password?: string): Promise<OpenPdf> {
  const library = await pdfjs()
  const task = library.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    password,
    /* A document's form scripts never run inside the app. */
    enableXfa: false,
  })
  try {
    const pdf = await task.promise
    return {
      pdf,
      close: () => {
        void task.destroy()
      },
    }
  } catch (error) {
    void task.destroy()
    if (error instanceof library.PasswordException) {
      throw new PdfPasswordError(error.code === library.PasswordResponses.INCORRECT_PASSWORD)
    }
    throw error
  }
}

/**
 * The text a digital PDF carries — exact, instant, and no OCR needed. Empty
 * when the PDF is a scan (pictures of pages), which the caller then reads as
 * images instead.
 */
export async function pdfText(pdf: PDFDocumentProxy): Promise<string> {
  const pages: string[] = []
  const count = Math.min(pdf.numPages, MAX_TEXT_PAGES)
  for (let number = 1; number <= count; number += 1) {
    const page = await pdf.getPage(number)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    pages.push(text)
    page.cleanup()
  }
  return pages.join('\n')
}

/** One page drawn to a canvas, no larger than `maxSide` on its long edge. */
export async function renderPage(
  pdf: PDFDocumentProxy,
  number: number,
  maxSide: number,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(number)
  const base = page.getViewport({ scale: 1 })
  const scale = maxSide / Math.max(base.width, base.height)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  page.cleanup()
  /* Flattened onto white — some scans have a transparent page ground. */
  return toCanvas(canvas, maxSide)
}
