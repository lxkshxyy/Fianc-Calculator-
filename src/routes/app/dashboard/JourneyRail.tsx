import { useEffect, useRef } from 'react'

import { SectionLabel } from '@/components/ui/SectionLabel'
import { StageCard } from '@/components/ui/StageCard'
import type { Derived } from '@/domain/derive'
import { STAGES, STAGE_COPY_PENDING, stageProgress, stageState } from '@/domain/journey'
import type { Tier } from '@/data/schema'
import { formatCompact } from '@/lib/money'

/**
 * §9.1 item 4 — the stage rail.
 *
 * §10.6: this is **the only horizontally scrolling element in the app**. It owns
 * its own overflow container so the page body never scrolls sideways, and it
 * snaps so a half-cut card cannot be the resting state on a phone.
 *
 * The band labels are built from numbers through money.ts rather than written as
 * strings, because §12 greps for the rupee symbol and only one file may hold it.
 */
function bandLabel(from: number | null, to: number | null): string {
  if (from === null && to === null) return 'Any balance'
  if (from === null) return `Up to ${formatCompact(to)}`
  if (to === null) return `${formatCompact(from)} and beyond`
  return `${formatCompact(from)} – ${formatCompact(to)}`
}

export function JourneyRail({ derived, tier }: { derived: Derived; tier: Tier }) {
  const railRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLDivElement>(null)
  const currentStageId = derived.stage?.id ?? STAGES[0]?.id ?? ''

  /*
   * Bring the current stage into view once, without scrolling the page itself —
   * `scrollIntoView` would move the document. Setting scrollLeft on the rail
   * keeps the movement inside the container.
   */
  useEffect(() => {
    const rail = railRef.current
    const card = currentRef.current
    if (rail === null || card === null) return
    const offset = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2
    rail.scrollLeft = Math.max(0, offset)
  }, [currentStageId])

  return (
    <section aria-label="Your journey">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>Your journey</SectionLabel>
        {STAGE_COPY_PENDING ? (
          <span className="text-caption text-text-3">Stage names provisional</span>
        ) : null}
      </div>

      <div
        ref={railRef}
        className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin]"
      >
        {STAGES.map((stage) => {
          const state = stageState(stage, currentStageId, tier)
          return (
            <div
              key={stage.id}
              ref={stage.id === currentStageId ? currentRef : undefined}
              className="w-[220px] shrink-0 snap-center sm:w-[240px]"
            >
              <StageCard
                index={stage.index}
                name={stage.name}
                tagline={stage.tagline}
                wealthBand={bandLabel(stage.bandFrom, stage.bandTo)}
                icon={stage.icon}
                tier={stage.tier}
                state={state}
                progress={stageProgress(stage, derived.completedTaskIds) ?? undefined}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
