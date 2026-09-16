import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'

/**
 * The name, set once.
 *
 * `short` is not a style choice — it is for the places the platform would clip
 * the full name regardless, so the app chooses the abbreviation rather than
 * letting an ellipsis choose it.
 */
export function Wordmark({ short = false, className }: { short?: boolean; className?: string }) {
  if (short) {
    return (
      <span className={cn('text-text font-bold tracking-tight', className)}>{BRAND.short}</span>
    )
  }

  return (
    <span className={cn('text-text font-bold tracking-tight', className)}>
      {BRAND.lead} <span className="text-accent">{BRAND.tail}</span>
    </span>
  )
}
