import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'

/**
 * The mark and lockup, for the two form screens.
 *
 * The welcome screen uses the brand board itself — a real image, one per theme.
 * These two are drawn rather than placed because they sit above a form at a
 * size a picture would have to be re-exported for, and because they take their
 * colour from the same tokens as everything else, so they follow the theme
 * instead of needing a second file.
 *
 * Every shape is `aria-hidden`: it carries mood, not information. What a screen
 * reader needs from these screens is the heading and the form.
 */

/**
 * The mark: WRC, with the C opening into a leaf and a rising line.
 *
 * Set as text rather than outlined paths, so it renders in the same display
 * face as every heading in the app and stays legible when somebody has their
 * phone on large text — an outlined logo is a picture of a font and ignores all
 * of that.
 */
export function WrcMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-accent-strong font-display leading-none font-extrabold tracking-tight',
            size === 'lg' ? 'text-[2.75rem]' : size === 'md' ? 'text-[2rem]' : 'text-[1.5rem]',
          )}
        >
          WRC
        </span>
        <GrowthGlyph
          className={cn(
            'text-accent',
            size === 'lg' ? 'size-9' : size === 'md' ? 'size-7' : 'size-5',
          )}
        />
      </div>
      <span
        className={cn(
          'text-accent-strong mt-1.5 font-semibold uppercase',
          size === 'lg' ? 'text-caption' : 'text-micro',
        )}
        style={{ letterSpacing: '0.22em' }}
      >
        {BRAND.full}
      </span>
    </div>
  )
}

/** A leaf on a stem, with a line climbing past it. The mark's right half. */
function GrowthGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      {/* The climbing line, ending in an arrow head. */}
      <path
        d="M4 26 L12 18 L18 22 L28 8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7.5 L28.5 7 L28 14.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Two leaves off a stem — the "rebuild" half of the name. */}
      <path
        d="M11 30 V22"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M11 23c-4 0-6-2.2-6-5.4 3.8-.6 6 1.6 6 5.4Z" fill="currentColor" opacity="0.55" />
      <path d="M11 22c3.6-.8 5-3.4 4.4-6.6-3.6.6-5 3-4.4 6.6Z" fill="currentColor" opacity="0.8" />
    </svg>
  )
}
