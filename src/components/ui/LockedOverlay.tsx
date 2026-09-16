import { Lock } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { AppButton } from './AppButton'

/**
 * §9.5 — a gated surface renders a blurred preview behind a lock, one line
 * naming **the specific thing being unlocked** (not the whole plan's feature
 * list), and an Upgrade button.
 *
 * §2.1.11 — it never renders an empty page and it never throws. The preview
 * behind the blur is inert: `aria-hidden` and pointer-events removed, so a
 * keyboard user cannot tab into content they cannot have.
 */
export function LockedOverlay({
  unlocks,
  onUpgrade,
  children,
  className,
}: {
  /** The specific thing, e.g. "the prepayment calculator" — used in one sentence. */
  unlocks: string
  onUpgrade?: () => void
  /** The real surface, blurred behind the lock. */
  children: ReactNode
  className?: string
}) {
  const previewRef = useRef<HTMLDivElement>(null)

  /*
   * `inert` is not in React 18's JSX types, so it is set on the node directly.
   * Without it a keyboard user can still tab into the blurred content behind the
   * lock — aria-hidden and pointer-events-none do not stop focus.
   */
  useEffect(() => {
    previewRef.current?.setAttribute('inert', '')
  }, [])

  return (
    <div className={cn('rounded-card relative overflow-hidden', className)}>
      <div ref={previewRef} aria-hidden className="pointer-events-none blur-[6px] select-none">
        {children}
      </div>
      <div className="rounded-card bg-bg/70 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="rounded-pill border-gold-dim bg-gold/10 text-gold flex size-11 items-center justify-center border">
          <Lock aria-hidden className="size-5" />
        </span>
        <p className="text-body text-text max-w-xs font-medium">
          Upgrade to Diamond to unlock {unlocks}.
        </p>
        <AppButton variant="primary" size="sm" onClick={onUpgrade}>
          Upgrade
        </AppButton>
      </div>
    </div>
  )
}
