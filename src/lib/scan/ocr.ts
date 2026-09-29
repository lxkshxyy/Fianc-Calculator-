/**
 * Optical character recognition, on the phone, with no network.
 *
 * Tesseract runs as WebAssembly in a worker. Its three parts — the worker
 * script, the engine and the English model — ship inside the app under /ocr/
 * (the `ocrAssets` plugin in vite.config.ts copies them there at build time),
 * so a document is read the same with or without a connection, and never leaves
 * the phone to be read.
 *
 * The first scan after the app opens takes a few seconds longer: that is the
 * ~7 MB engine and model loading. The worker is shut down after every scan
 * rather than kept warm, because a phone that is also holding the camera app
 * in memory has none to spare for a model nobody is using.
 */

import { ReaderLoadError } from './errors'

/** Any Android WebView from the last few years runs the SIMD build, which is roughly twice as fast. */
function hasSimd(): boolean {
  try {
    /* The smallest module that uses a SIMD instruction — wasm-feature-detect's probe. */
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0,
        253, 15, 253, 98, 11,
      ]),
    )
  } catch {
    return false
  }
}

export function isOcrSupported(): boolean {
  return typeof WebAssembly === 'object' && typeof Worker === 'function'
}

function assetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}ocr/${path}`, window.location.href).href
}

/** One OCR engine, kept for the pages of one document and then shut down. */
export type Recogniser = {
  read: (image: HTMLCanvasElement, onProgress?: (progress: number) => void) => Promise<string>
  close: () => Promise<void>
}

/**
 * Starts the engine once for a whole document. Loading the model is the slow
 * part of OCR; doing it once rather than for every page is what makes reading
 * a ten-page scanned statement bearable on a phone.
 */
export async function openRecogniser(): Promise<Recogniser> {
  let report: ((progress: number) => void) | undefined
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>>
  try {
    const { createWorker } = await import('tesseract.js')
    worker = await startWorker(createWorker, (progress) => report?.(progress))
  } catch (error) {
    throw new ReaderLoadError('photo reader', error)
  }
  return {
    read: async (image, onProgress) => {
      report = onProgress
      try {
        const result = await worker.recognize(image)
        return result.data.text
      } finally {
        report = undefined
      }
    },
    close: async () => {
      await worker.terminate()
    },
  }
}

function startWorker(
  createWorker: typeof import('tesseract.js').createWorker,
  onProgress: (progress: number) => void,
) {
  return createWorker('eng', 1, {
    workerPath: assetUrl('worker.min.js'),
    corePath: assetUrl(
      hasSimd() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js',
    ),
    langPath: assetUrl('').replace(/\/$/, ''),
    /* Shipped unzipped — the Android build renames `.gz` assets (vite.config.ts). */
    gzip: false,
    /* The model is already on the phone, inside the app. A second copy in
       IndexedDB would only take up the person's storage. */
    cacheMethod: 'none',
    workerBlobURL: false,
    logger: (message: { status: string; progress: number }) => {
      if (message.status === 'recognizing text') onProgress(message.progress)
    },
  })
}

/** A single image, start to finish. */
export async function recognise(
  image: HTMLCanvasElement,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const recogniser = await openRecogniser()
  try {
    return await recogniser.read(image, onProgress)
  } finally {
    await recogniser.close()
  }
}
