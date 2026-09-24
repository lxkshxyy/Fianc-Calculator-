/**
 * Getting pixels out of an image file, at a size a phone can work with.
 *
 * A modern phone camera writes 12–50 megapixel photos. Reading text needs about
 * 2,000 pixels on the long side — more only makes OCR slower and, on a mid-range
 * phone, can run the WebView out of memory. Everything here scales down first.
 *
 * An <img> is used to decode rather than createImageBitmap: it applies the
 * photo's EXIF rotation on every WebView this app runs in, so a portrait photo
 * of a policy is read upright instead of on its side.
 */

export async function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    /* decode() has finished with the bytes by the time it resolves or rejects. */
    URL.revokeObjectURL(url)
  }
}

/** Draws a source onto a new canvas no larger than `maxSide` on its long edge. */
export function toCanvas(
  source: CanvasImageSource & { width: number; height: number },
  maxSide: number,
  width = source.width,
  height = source.height,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('Canvas is not available.')
  /* White first, so a transparent PNG does not read as black-on-black. */
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function imageToCanvas(blob: Blob, maxSide: number): Promise<HTMLCanvasElement> {
  const image = await decodeImage(blob)
  return toCanvas(image, maxSide, image.naturalWidth, image.naturalHeight)
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) reject(new Error('Could not encode the image.'))
        else resolve(blob)
      },
      type,
      quality,
    )
  })
}

/** Photos above this are re-encoded smaller before they are stored. */
const STORE_AS_IS_BELOW = 2_500_000

/**
 * The copy of an image that is worth keeping on the phone.
 *
 * A 6 MB camera JPEG and a 700 KB one at 2,400 pixels look the same on a
 * phone screen and read the same to OCR, and forty scanned documents is the
 * difference between 240 MB and 28 MB of somebody's storage. Small files and
 * PDFs are kept exactly as they came.
 */
export async function imageForStorage(blob: Blob): Promise<Blob> {
  if (blob.size < STORE_AS_IS_BELOW) return blob
  try {
    const canvas = await imageToCanvas(blob, 2400)
    const smaller = await canvasToBlob(canvas, 'image/jpeg', 0.85)
    return smaller.size < blob.size ? smaller : blob
  } catch {
    /* Could not decode it here — keep the original rather than lose it. */
    return blob
  }
}
