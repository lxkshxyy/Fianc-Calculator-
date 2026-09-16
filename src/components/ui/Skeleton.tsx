import { cn } from '@/lib/cn'

/**
 * §2.1.8 / §10.7 — loading placeholders carry a **fixed height** so content
 * arriving does not shift the page under the user's thumb. Height is required,
 * not optional, for exactly that reason.
 */
export function Skeleton({
  height,
  width = '100%',
  className,
  rounded = 'tile',
}: {
  height: number | string
  width?: number | string
  className?: string
  rounded?: 'tile' | 'card' | 'pill'
}) {
  return (
    <div
      aria-hidden
      style={{ height, width }}
      className={cn(
        'bg-surface-2 animate-pulse',
        rounded === 'card' && 'rounded-card',
        rounded === 'tile' && 'rounded-tile',
        rounded === 'pill' && 'rounded-pill',
        className,
      )}
    />
  )
}
