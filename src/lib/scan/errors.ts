/**
 * A part of the document reader — pdf.js, or the OCR engine and its model —
 * could not be started, as opposed to a file that could not be read.
 *
 * The difference decides what the person is told. A reader that did not load
 * (no connection, or on a computer running the website locally, its server
 * stopped while the app kept working from its offline copy) is worth trying
 * again. A damaged file is not. The OCR library rejects with nothing at all
 * when its worker cannot be fetched, so this cannot be told from the error's
 * message; it is decided by where the failure happened instead.
 */
export class ReaderLoadError extends Error {
  constructor(part: string, cause: unknown) {
    super(`The ${part} did not load.`, { cause })
    this.name = 'ReaderLoadError'
  }
}
