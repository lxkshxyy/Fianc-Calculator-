import { cn } from '@/lib/cn'
import { type Amount, amountTone, formatCompact, formatExact, formatFull } from '@/lib/money'

/**
 * §4.5 — the only way a rupee figure reaches the screen.
 *
 * §4.2 — tabular numerals always, and hero figures are coloured by sign:
 * positive `--text`, negative `--danger`. Whenever the rendered text is not the
 * figure itself the exact amount stays reachable through the title and
 * aria-label, so "₹15.7 L" never hides the ₹15,70,000 a user is reconciling
 * against a statement.
 *
 * §4.5b — `full` is a request, not a guarantee: a figure past ten digits comes
 * back from `money.ts` rounded whatever was asked for, because there is no exact
 * form of it that fits on a phone. The title still carries the real number.
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
  /* Whenever what is drawn differs from the real figure — compacted, or a `full`
     that money.ts rounded because it was too wide — the real one goes on the
     title. When they are the same, a duplicate tooltip is just noise. */
  const showExactTitle = tag !== 'unknown' && display !== exact

  return (
    <span
      title={showExactTitle ? exact : undefined}
      aria-label={showExactTitle ? exact : undefined}
      className={cn(
        /* §4.5b's second half: money.ts bounds how long a figure can be, this
           bounds what happens if one ever slips past — it wraps inside the card
           rather than widening the page. */
        'tabular inline-block max-w-full [overflow-wrap:anywhere]',
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
