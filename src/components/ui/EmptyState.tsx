import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * §2.1.8 — every list has one of these. An empty list is never an empty box:
 * it says what would be here and offers the action that puts something in it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-tile px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-pill bg-surface-2 text-text-2">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-body font-semibold text-text">{title}</p>
        <p className="mx-auto max-w-xs text-meta text-text-2">{description}</p>
      </div>
      {action}
    </div>
  )
}
