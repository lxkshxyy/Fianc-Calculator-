import { imageToCanvas } from './image'
import { isOcrSupported, recognise } from './ocr'
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
  | { status: 'failed'; reason: string }

/** Pages of a scanned (image-only) PDF worth running OCR over. */
const MAX_OCR_PAGES = 3
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
        for (let number = 1; number <= pages; number += 1) {
          const detail = pages > 1 ? `Page ${String(number)} of ${String(pages)}` : undefined
          report({ stage: 'recognising', progress: (number - 1) / pages, detail })
          const canvas = await renderPage(pdf, number, OCR_SIDE)
          parts.push(
            await recognise(canvas, (fraction) => {
              report({ stage: 'recognising', progress: (number - 1 + fraction) / pages, detail })
            }),
          )
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

    return { status: 'failed', reason: 'Only PDFs and photos (JPG, PNG, WebP) can be read.' }
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      return { status: 'needs-password', wrongPassword: error.wrongPassword }
    }
    console.warn('Document scan failed.', error)
    return {
      status: 'failed',
      reason: 'This file could not be read. You can still save it and add the details yourself.',
    }
  }
}

function unsupported(): ScanOutcome {
  return {
    status: 'failed',
    reason: 'Reading documents is not supported on this phone. You can still save the file.',
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
