import { decodeImage } from './scan/image'

/**
 * A gallery photo, made fit to be a profile picture.
 *
 * Centre-cropped to a square and drawn at 320 px — twice the largest size the
 * app ever shows an avatar, so it stays sharp on a high-density screen — then
 * saved as a JPEG data URL of roughly 20–40 KB. It lives on the one profile
 * record, so a 5 MB camera original must never go there as it is.
 */
const SIDE = 320
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024

export async function photoToAvatar(file: Blob): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Photo too large.')
  const image = await decodeImage(file)
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width === 0 || height === 0) throw new Error('Empty image.')

  const crop = Math.min(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = SIDE
  canvas.height = SIDE
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('Canvas is not available.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, SIDE, SIDE)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, (width - crop) / 2, (height - crop) / 2, crop, crop, 0, 0, SIDE, SIDE)
  return canvas.toDataURL('image/jpeg', 0.86)
}
