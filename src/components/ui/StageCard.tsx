import { Check, Lock, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { TierBadge, type Tier } from './TierBadge'

/**
 * §7 — a journey stage in one of four states.
 *
 * "Locked is conveyed by glyph *and* label — never by opacity alone", so the
 * locked state carries a lock icon and the word "Locked" as well as the dimmed
 * treatment. The card is presentational: the six canonical stages live in
 * `src/domain/journey.ts` from Phase 4 and no screen hardcodes a stage name.
 */
export type StageState = 'locked' | 'available' | 'current' | 'complete'

export function StageCard({
  index,
  name,
  tagline,
  wealthBand,
  icon: Icon,
  tier,
  state,
  progress,
  to,
  className,
}: {
  index: number
  name: string
  tagline: string
  wealthBand: string
  icon: LucideIcon
  tier: Tier
  state: StageState
  /** 0–1, from the stage checklist. Only meaningful for `current`. */
  progress?: number
  /** When set, the whole card is a link to this route. Omit for a static card. */
  to?: string
  className?: string
}) {
  const isLocked = state === 'locked'
  const isCurrent = state === 'current'
  const isComplete = state === 'complete'

  const card = (
    <article
      aria-current={isCurrent ? 'step' : undefined}
      className={cn(
        /*
         * w-full, not a fixed width. The card used to hardcode 248px while every
         * caller wrapped it in a box of a different size — 220px in the rail,
         * 240px in onboarding — so it overflowed its own container and pushed the
         * tier badge past the edge. The caller owns the width; the card fills it.
         */
        'rounded-card relative flex w-full flex-col gap-3 border p-4',
        'transition-colors duration-150',
        isCurrent ? 'border-gold bg-surface' : 'border-border bg-surface',
        isLocked && 'opacity-70',
        className,
      )}
    >
      {isCurrent ? (
        <span className="rounded-pill bg-gold text-micro text-on-gold absolute -top-2 left-4 px-2 py-0.5 font-semibold tracking-[0.1em] uppercase">
          Current
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'rounded-tile flex size-9 items-center justify-center',
            isCurrent ? 'bg-gold/15 text-gold' : 'bg-surface-2 text-text-2',
            isComplete && 'text-gold-dim',
          )}
        >
          {isLocked ? (
            <Lock aria-hidden className="size-4" />
          ) : isComplete ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Icon aria-hidden className="size-4" />
          )}
        </span>
        <TierBadge tier={tier} size="sm" />
      </div>

      <div className="space-y-1">
        <p className="text-micro text-text-label font-medium tracking-[0.1em] uppercase">
          Stage {index}
        </p>
        <h3 className="text-body text-text font-semibold">{name}</h3>
        <p className="text-caption text-text-2">{tagline}</p>
      </div>

      <p className="tabular text-caption text-text-3">{wealthBand}</p>

      <div className="mt-auto flex items-center gap-2">
        {isLocked ? (
          <span className="text-caption text-text-2 inline-flex items-center gap-1.5 font-medium">
            <Lock aria-hidden className="size-3.5" />
            Locked
          </span>
        ) : isComplete ? (
          <span className="text-caption text-text-2 inline-flex items-center gap-1.5 font-medium">
            <Check aria-hidden className="size-3.5" />
            Complete
          </span>
        ) : (
          <div className="flex w-full items-center gap-2">
            <div className="rounded-pill bg-surface-2 h-1.5 flex-1 overflow-hidden">
              <div
                className="rounded-pill bg-gold h-full"
                style={{ width: Math.round(Math.min(Math.max(progress ?? 0, 0), 1) * 100) + '%' }}
              />
            </div>
            <span className="tabular text-caption text-text-2">
              {Math.round(Math.min(Math.max(progress ?? 0, 0), 1) * 100)}%
            </span>
          </div>
        )}
      </div>
    </article>
  )

  if (to === undefined) return card

  /*
   * A link around the card, not a button inside it — the whole card is the
   * target, which is the 44px-plus tap area §10 asks for, and it keeps
   * middle-click and "open in new tab" working the way a link should.
   */
  return (
    <Link
      to={to}
      aria-label={`Stage ${String(index)}: ${name}`}
      className="rounded-card focus-visible:outline-gold block transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:hover:translate-y-0"
    >
      {card}
    </Link>
  )
}
