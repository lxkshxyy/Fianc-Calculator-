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
        'rounded-tile flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="rounded-pill bg-surface-2 text-text-2 flex size-11 items-center justify-center">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-body text-text font-semibold">{title}</p>
        <p className="text-meta text-text-2 mx-auto max-w-xs">{description}</p>
      </div>
      {action}
    </div>
  )
}
