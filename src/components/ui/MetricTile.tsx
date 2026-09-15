import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { SectionLabel } from './SectionLabel'

/**
 * §9.1 item 6 — the KEY METRICS tile: label, icon top-right, value, and a small
 * delta. Grid placement (4 / 2 / 1) belongs to the screen, not the tile.
 */
export function MetricTile({
  label,
  icon: Icon,
  value,
  delta,
  className,
}: {
  label: string
  icon: LucideIcon
  /** Already formatted — a rupee value arrives as a <CurrencyText />, never a raw number. */
  value: ReactNode
  delta?: { direction: 'up' | 'down'; text: string; isGood: boolean }
  className?: string
}) {
  const DeltaIcon = delta?.direction === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <div className={cn('rounded-card border border-border bg-surface p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <Icon aria-hidden className="size-4 shrink-0 text-text-3" />
      </div>
      <div className="mt-3 font-semibold text-text">{value}</div>
      {delta === undefined ? (
        <div className="mt-1.5 h-[18px]" aria-hidden />
      ) : (
        <p
          className={cn(
            'mt-1.5 flex h-[18px] items-center gap-1 text-caption',
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
