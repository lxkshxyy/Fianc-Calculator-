import { PREVIEW_ALL } from '@/config/preview'

/**
 * A standing reminder that the paywall is switched off.
 *
 * Deliberately not dismissible. A banner you can hide is a banner that gets
 * hidden on day one and forgotten by launch, which is how a build ships with
 * every paid feature free. It disappears on its own the moment PREVIEW_ALL is
 * set to false — there is nothing else to remove.
 */
export function PreviewBanner() {
  if (!PREVIEW_ALL) return null

  return (
    <div
      role="status"
      className="border-gold-dim bg-gold/10 text-caption text-text-2 border-b px-4 py-1.5 text-center sm:px-6"
    >
      <span className="text-gold font-semibold">Preview mode</span> — every paid screen is unlocked.
      Turn it off in <code className="text-text">src/config/preview.ts</code> before publishing.
    </div>
  )
}
