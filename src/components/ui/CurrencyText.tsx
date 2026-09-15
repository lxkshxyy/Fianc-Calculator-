import { cn } from '@/lib/cn'
import { type Amount, amountTone, formatCompact, formatExact, formatFull } from '@/lib/money'

/**
 * §4.5 — the only way a rupee figure reaches the screen.
 *
 * §4.2 — tabular numerals always, and hero figures are coloured by sign:
 * positive `--text`, negative `--danger`. When the compact form is shown the
 * exact figure stays reachable through the title and aria-label, so "₹15.7 L"
 * never hides the ₹15,70,000 a user is reconciling against a statement.
 */
export function CurrencyText({
  value,
  variant = 'compact',
  size = 'body',
  tone = 'auto',
  className,
}: {
  value: Amount
  variant?: 'compact' | 'full'
  size?: 'body' | 'lead' | 'title' | 'heading' | 'page' | 'hero'
  /** `auto` applies the §4.2 sign colouring; `inherit` leaves colour to the parent. */
  tone?: 'auto' | 'inherit'
  className?: string
}) {
  const display = variant === 'compact' ? formatCompact(value) : formatFull(value)
  const exact = formatExact(value)
  const tag = amountTone(value)
  const showExactTitle = variant === 'compact' && tag !== 'unknown'

  return (
    <span
      title={showExactTitle ? exact : undefined}
      aria-label={showExactTitle ? exact : undefined}
      className={cn(
        'tabular',
        {
          'text-body': size === 'body',
          'text-lead': size === 'lead',
          'text-title': size === 'title',
          'text-heading': size === 'heading',
          'text-page': size === 'page',
          'text-hero': size === 'hero',
        },
        tone === 'auto' && tag === 'negative' && 'text-danger',
        tone === 'auto' && tag === 'unknown' && 'text-text-3',
        className,
      )}
    >
      {display}
    </span>
  )
}
