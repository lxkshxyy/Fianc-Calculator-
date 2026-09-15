import { Check, Lock, type LucideIcon } from 'lucide-react'

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
  className?: string
}) {
  const isLocked = state === 'locked'
  const isCurrent = state === 'current'
  const isComplete = state === 'complete'

  return (
    <article
      aria-current={isCurrent ? 'step' : undefined}
      className={cn(
        'relative flex w-[248px] shrink-0 flex-col gap-3 rounded-card border p-4',
        'transition-colors duration-150',
        isCurrent ? 'border-gold bg-surface' : 'border-border bg-surface',
        isLocked && 'opacity-70',
        className,
      )}
    >
      {isCurrent ? (
        <span className="absolute -top-2 left-4 rounded-pill bg-gold px-2 py-0.5 text-micro font-semibold tracking-[0.1em] text-on-gold uppercase">
          Current
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-tile',
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
        <p className="text-micro font-medium tracking-[0.1em] text-text-label uppercase">
          Stage {index}
        </p>
        <h3 className="text-body font-semibold text-text">{name}</h3>
        <p className="text-caption text-text-2">{tagline}</p>
      </div>

      <p className="tabular text-caption text-text-3">{wealthBand}</p>

      <div className="mt-auto flex items-center gap-2">
        {isLocked ? (
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-text-2">
            <Lock aria-hidden className="size-3.5" />
            Locked
          </span>
        ) : isComplete ? (
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-text-2">
            <Check aria-hidden className="size-3.5" />
            Complete
          </span>
        ) : (
          <div className="flex w-full items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
              <div
                className="h-full rounded-pill bg-gold"
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
}
