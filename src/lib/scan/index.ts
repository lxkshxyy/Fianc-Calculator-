import { ReaderLoadError } from './errors'
import { imageToCanvas } from './image'
import { isOcrSupported, openRecogniser, recognise } from './ocr'
import { openPdf, pdfText, PdfPasswordError, renderPage } from './pdf'

/**
 * Reading a document on the phone: file in, text out.
 *
 * A digital PDF gives its text up directly. A photo, or a PDF that is only
 * pictures of pages, goes through OCR. Either way nothing leaves the device.
 *
 * `scanFile` never throws. Every way this can go wrong — a password, a file
 * that will not decode, a phone with no WebAssembly — comes back as an outcome
 * the upload sheet can say something useful about, because a failed scan must
 * never cost somebody the upload itself.
 */

export type ScanStage = 'opening' | 'reading' | 'recognising'

export type ScanProgress = {
  stage: ScanStage
  /** 0–1 across the whole scan. */
  progress: number
  /** "Page 2 of 3", when there is more than one. */
  detail?: string
}

export type ScanOutcome =
  | { status: 'done'; method: 'pdf-text' | 'ocr'; text: string }
  | { status: 'needs-password'; wrongPassword: boolean }
  /**
   * `retry` is true when the file was never really tried — the reader itself
   * did not load (no connection, or the website's server stopped) — so trying
   * again can work. False means the file itself could not be read.
   */
  | { status: 'failed'; reason: string; retry: boolean }

/**
 * Pages of a scanned (image-only) PDF run through OCR. Each takes a few
 * seconds on a phone, and the sheet shows "Page 2 of 6" as it goes, so a whole
 * scanned statement is read rather than only its first pages.
 */
export const MAX_OCR_PAGES = 10
/** Enough resolution for small print without making a phone wait a minute. */
const OCR_SIDE = 2000
/** Below this much text, a PDF is treated as pictures of pages. */
const MIN_PDF_TEXT = 40

export const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp'
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export type FileFamily = 'pdf' | 'image' | 'unsupported'

/**
 * What a picked file is. The MIME type first, the extension as a fallback —
 * some Android file pickers hand over a file with an empty `type`.
 */
export function fileFamily(file: { type: string; name?: string }): FileFamily {
  const type = file.type.toLowerCase()
  const name = (file.name ?? '').toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (/^image\/(jpeg|png|webp)$/.test(type) || /\.(jpe?g|png|webp)$/.test(name)) return 'image'
  return 'unsupported'
}

export async function scanFile(
  file: Blob & { name?: string },
  options: { password?: string; onProgress?: (progress: ScanProgress) => void } = {},
): Promise<ScanOutcome> {
  const report = options.onProgress ?? (() => undefined)
  const family = fileFamily(file)

  try {
    if (family === 'pdf') {
      report({ stage: 'opening', progress: 0.05 })
      const { pdf, close } = await openPdf(file, options.password)
      try {
        report({ stage: 'reading', progress: 0.2 })
        const text = await pdfText(pdf)
        if (text.replace(/\s+/g, '').length >= MIN_PDF_TEXT) {
          report({ stage: 'reading', progress: 1 })
          return { status: 'done', method: 'pdf-text', text }
        }
        if (!isOcrSupported()) return unsupported()

        const pages = Math.min(pdf.numPages, MAX_OCR_PAGES)
        const parts: string[] = []
        report({ stage: 'recognising', progress: 0 })
        const recogniser = await openRecogniser()
        try {
          for (let number = 1; number <= pages; number += 1) {
            const detail = pages > 1 ? `Page ${String(number)} of ${String(pages)}` : undefined
            report({ stage: 'recognising', progress: (number - 1) / pages, detail })
            const canvas = await renderPage(pdf, number, OCR_SIDE)
            parts.push(
              await recogniser.read(canvas, (fraction) => {
                report({ stage: 'recognising', progress: (number - 1 + fraction) / pages, detail })
              }),
            )
          }
        } finally {
          await recogniser.close()
        }
        return { status: 'done', method: 'ocr', text: parts.join('\n') }
      } finally {
        close()
      }
    }

    if (family === 'image') {
      if (!isOcrSupported()) return unsupported()
      report({ stage: 'opening', progress: 0.05 })
      const canvas = await imageToCanvas(file, OCR_SIDE)
      report({ stage: 'recognising', progress: 0.1 })
      const text = await recognise(canvas, (fraction) => {
        report({ stage: 'recognising', progress: 0.1 + fraction * 0.9 })
      })
      return { status: 'done', method: 'ocr', text }
    }

    return {
      status: 'failed',
      reason: 'Only PDFs and photos (JPG, PNG, WebP) can be read.',
      retry: false,
    }
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      return { status: 'needs-password', wrongPassword: error.wrongPassword }
    }
    console.warn('Document scan failed.', error)
    return {
      status: 'failed',
      ...(isLoadFailure(error)
        ? {
            reason:
              'The document reader did not load. Check your internet connection and try again.',
            retry: true,
          }
        : {
            reason: 'This file could not be opened. It may be damaged — try saving it again.',
            retry: false,
          }),
    }
  }
}

/**
 * A part of the reader (pdf.js, the OCR engine or its language data) that could
 * not be fetched. On the website that means no connection, or — on a computer
 * running the site locally — its server stopped; the app itself is still open
 * from the offline copy. Worded by each browser differently.
 */
export function isLoadFailure(error: unknown): boolean {
  if (error instanceof ReaderLoadError) return true
  /* A worker whose script could not be fetched rejects with its error event, not an Error. */
  if (typeof Event !== 'undefined' && error instanceof Event) return true
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|importing a module script failed|failed to fetch|networkerror|load failed|network request failed|chunkloaderror|error loading dynamically|failed to load|importscripts/i.test(
    text,
  )
}

function unsupported(): ScanOutcome {
  return {
    status: 'failed',
    reason:
      'This phone cannot read photos of documents. Upload the PDF instead, or use the website.',
    retry: false,
  }
}

/**
 * Something to show for a stored file: the image itself, or the first page of a
 * PDF drawn as one. Returns an object URL the caller must revoke, or null.
 */
export async function previewUrl(
  file: Blob & { name?: string },
  password?: string,
): Promise<string | null> {
  try {
    const family = fileFamily(file)
    if (family === 'image') return URL.createObjectURL(file)
    if (family !== 'pdf') return null
    const { pdf, close } = await openPdf(file, password)
    try {
      const canvas = await renderPage(pdf, 1, 900)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      })
      return blob === null ? null : URL.createObjectURL(blob)
    } finally {
      close()
    }
  } catch {
    return null
  }
}
