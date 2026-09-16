import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { SectionLabel } from './SectionLabel'

/**
 * §4.1b — one hue per metric.
 *
 * Tailwind needs whole class names at build time, so these are written out
 * rather than assembled from a variable. The tile behind the icon is the same
 * hue at 12%: a wash on the dark ground, not a fill, so it never has to carry
 * contrast of its own — the icon on top does, and every hue clears AA.
 */
const TONES = {
  sky: 'bg-cat-sky/12 text-cat-sky',
  mint: 'bg-cat-mint/12 text-cat-mint',
  violet: 'bg-cat-violet/12 text-cat-violet',
  amber: 'bg-cat-amber/12 text-cat-amber',
  rose: 'bg-cat-rose/12 text-cat-rose',
  teal: 'bg-cat-teal/12 text-cat-teal',
  none: 'bg-surface-2 text-text-3',
} as const

export type MetricTone = keyof typeof TONES

/**
 * §9.1 item 6 — the KEY METRICS tile: label, icon top-right, value, and a small
 * delta. Grid placement (4 / 2 / 1) belongs to the screen, not the tile.
 */
export function MetricTile({
  label,
  icon: Icon,
  value,
  delta,
  tone = 'none',
  className,
}: {
  label: string
  icon: LucideIcon
  /** Already formatted — a rupee value arrives as a <CurrencyText />, never a raw number. */
  value: ReactNode
  delta?: { direction: 'up' | 'down'; text: string; isGood: boolean }
  /** Which category hue this metric carries. Defaults to no tint. */
  tone?: MetricTone
  className?: string
}) {
  const DeltaIcon = delta?.direction === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <div className={cn('rounded-card border-border bg-surface p-card border', className)}>
      <div className="flex items-start justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <span
          className={cn(
            'rounded-tile flex size-8 shrink-0 items-center justify-center',
            TONES[tone],
          )}
        >
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      <div className="text-text mt-3 font-semibold">{value}</div>
      {delta === undefined ? (
        <div className="mt-1.5 h-[18px]" aria-hidden />
      ) : (
        <p
          className={cn(
            'text-caption mt-1.5 flex h-[18px] items-center gap-1',
            delta.isGood ? 'text-success' : 'text-danger',
          )}
        >
          <DeltaIcon aria-hidden className="size-3.5" />
          <span className="tabular">{delta.text}</span>
        </p>
      )}
    </div>
  )
}
