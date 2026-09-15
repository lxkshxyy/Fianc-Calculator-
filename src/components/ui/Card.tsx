import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * §4.3 — `--surface` fill, a 1px `--border` hairline, 14px radius, and no drop
 * shadow. Depth comes from the fill step, not shadow. Padding is 20px desktop /
 * 16px mobile.
 */
export function Card({
  children,
  className,
  as: Element = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <Element
      className={cn(
        'rounded-card border border-border bg-surface p-4 sm:p-5',
        'transition-colors duration-150',
        className,
      )}
    >
      {children}
    </Element>
  )
}

/**
 * §4.3 — "Not everything is a card." A nested tile inside a card takes
 * `--surface-2` with **no** border; only the outer card gets the hairline.
 */
export function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-tile bg-surface-2 p-3', className)}>{children}</div>
}

export function CardHeader({
  title,
  action,
  icon,
}: {
  title: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-text-2">{icon}</span> : null}
        <h3 className="text-body font-semibold text-text">{title}</h3>
      </div>
      {action}
    </div>
  )
}
