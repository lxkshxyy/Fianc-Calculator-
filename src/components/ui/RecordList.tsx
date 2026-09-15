import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { EmptyState } from './EmptyState'

/**
 * §9.4's list, and §2.1.8's promise that **every** list has an empty state.
 *
 * Rows are buttons when `onSelect` is given, so the detail sheet opens from the
 * keyboard as well as a tap (§2.1.10), and they are plain list items when not —
 * rather than a div with a click handler, which is neither.
 */
export type RecordRow = {
  id: string
  icon?: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  meta?: ReactNode
  /** Rendered full-width under the row — a progress bar, a warning line. */
  footer?: ReactNode
}

export function RecordList({
  rows,
  empty,
  onSelect,
  className,
}: {
  rows: RecordRow[]
  empty: { icon: LucideIcon; title: string; description: string; action?: ReactNode }
  onSelect?: (id: string) => void
  className?: string
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    )
  }

  return (
    <ul className={cn('divide-y divide-border overflow-hidden rounded-card border border-border bg-surface', className)}>
      {rows.map((row) => {
        const body = (
          <>
            <div className="flex items-center gap-3">
              {row.icon === undefined ? null : (
                <row.icon aria-hidden className="size-4 shrink-0 text-text-3" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm text-text">{row.title}</div>
                {row.subtitle === undefined ? null : (
                  <div className="truncate text-caption text-text-2">{row.subtitle}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                {row.value}
                {row.meta === undefined ? null : (
                  <div className="text-caption text-text-2">{row.meta}</div>
                )}
              </div>
            </div>
            {row.footer === undefined ? null : <div className="mt-2.5">{row.footer}</div>}
          </>
        )

        return (
          <li key={row.id}>
            {onSelect === undefined ? (
              <div className="px-4 py-3.5">{body}</div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelect(row.id)
                }}
                className="w-full px-4 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-text-2 focus-visible:-outline-offset-2"
              >
                {body}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A thin proportion bar. `value` is 0–1 and is clamped; over-budget shows danger. */
export function Meter({ value, tone = 'gold' }: { value: number; tone?: 'gold' | 'danger' | 'success' }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <span
        className={cn(
          'block h-full rounded-full',
          tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-gold',
        )}
        style={{ width: `${String(pct)}%` }}
      />
    </span>
  )
}
