import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * §4.2 — 11px, uppercase, 0.1em tracking, `--text-label`.
 *
 * Never `--text-3` here: at 11px that token is 4.19 / 3.82 / 3.56 against --bg,
 * --surface and --surface-2, all under AA, and this label ships on every screen.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-micro font-medium tracking-[0.1em] text-text-label uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}
