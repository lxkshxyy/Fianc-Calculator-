import { Check, ChevronDown, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { TierBadge } from '@/components/ui/TierBadge'
import { NAV_GROUPS } from '@/app/nav/navigation'
import { STAGES, moduleTier, type Stage } from '@/domain/journey'
import { cn } from '@/lib/cn'
import { bandLabel, moduleLabel, PRICE_NOTE, type Faq } from './publicData'

/**
 * What the home page shows in brief and the Stages, Pricing and FAQ pages show
 * in full. One copy of each, so the summary and the page cannot disagree.
 */

/* ------------------------------------------------------------------ *
 * The ladder
 * ------------------------------------------------------------------ */

/** The six stages as a vertical ladder — the home page's summary. */
export function StageLadder() {
  return (
    <ol className="mt-5 space-y-0">
      {STAGES.map((stage, index) => (
        <li key={stage.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < STAGES.length - 1 ? (
            <span aria-hidden className="bg-border absolute top-10 bottom-0 left-[19px] w-px" />
          ) : null}
          <span className="border-border bg-surface relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border">
            <stage.icon aria-hidden className="text-gold size-4" />
          </span>
          <div className="min-w-0 flex-1 pt-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-text font-semibold">{stage.name}</h3>
              {stage.tier === 'diamond' ? <TierBadge tier="diamond" /> : null}
            </div>
            <p className="text-text-2 mt-0.5 text-sm">{stage.tagline}</p>
            <p className="text-caption text-text-3 mt-1 font-mono tabular-nums">
              {bandLabel(stage.bandFrom, stage.bandTo)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** One stage in full — what you do there, and what it opens. The Stages page. */
export function StageCard({ stage }: { stage: Stage }) {
  return (
    <Card as="article" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="border-border bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-full border">
            <stage.icon aria-hidden className="text-gold size-5" />
          </span>
          <div>
            <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
              Stage {stage.index}
            </p>
            <h2 className="text-text text-lg font-semibold">
              <span aria-hidden>{stage.emoji} </span>
              {stage.name}
            </h2>
          </div>
        </div>
        <TierBadge tier={stage.tier} />
      </div>

      <p className="text-text-2 mt-3 text-sm">{stage.tagline}</p>
      <p className="text-caption text-text-3 mt-1 font-mono tabular-nums">
        Net worth {bandLabel(stage.bandFrom, stage.bandTo)}
      </p>

      <div className="border-border mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
        <div>
          <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
            What you do
          </p>
          <ul className="mt-2 space-y-1.5">
            {stage.checklist.map((task) => (
              <li key={task.id} className="text-text-2 flex items-start gap-2 text-sm">
                <Check aria-hidden className="text-success mt-0.5 size-3.5 shrink-0" />
                {task.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
            What opens
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {stage.unlocks.map((path) => (
              <li
                key={path}
                className="border-border text-text-2 bg-surface-2 rounded-full border px-2.5 py-1 text-xs"
              >
                {moduleLabel(path)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ *
 * Membership
 * ------------------------------------------------------------------ */

function stageNames(tier: 'silver' | 'diamond'): string {
  return STAGES.filter((stage) => stage.tier === tier)
    .map((stage) => stage.name)
    .join(' · ')
}

/** Silver and Diamond side by side. The home page and the Pricing page. */
export function MembershipCards() {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col">
        <h3 className="text-text text-title font-semibold">Silver</h3>
        <p className="text-text-2 mt-1 text-sm">Free, and it stays free.</p>
        <p className="text-caption text-text-label mt-4 tracking-[0.1em] uppercase">Opens</p>
        <p className="text-text mt-1 flex-1 text-sm">{stageNames('silver')}</p>
        <div className="mt-5">
          <Link to="/auth?mode=signup" className={buttonClass({ variant: 'outline', block: true })}>
            Start free
          </Link>
        </div>
      </Card>

      <Card className="border-gold-dim flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-text text-title font-semibold">Diamond</h3>
          <span className="bg-gold text-caption text-on-gold rounded-full px-2 py-0.5 font-medium">
            Recommended
          </span>
        </div>
        <p className="text-text-2 mt-1 text-sm">The full ladder, and a person to ask.</p>
        <p className="text-caption text-text-label mt-4 tracking-[0.1em] uppercase">Opens</p>
        <p className="text-text mt-1 flex-1 text-sm">
          Everything in Silver, plus {stageNames('diamond')}
        </p>
        <div className="mt-5">
          <Link to="/auth?mode=signup" className={buttonClass({ variant: 'primary', block: true })}>
            Start free, upgrade later
          </Link>
        </div>
        <p className="text-caption text-text-3 mt-3">{PRICE_NOTE}</p>
      </Card>
    </div>
  )
}

/**
 * Every tool, and which membership opens it — derived from the ladder, so the
 * table cannot promise what the app's own gate would refuse.
 */
export function MembershipTable() {
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.path.startsWith('/') && item.path !== 'settings'),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="rounded-card border-border bg-surface mt-4 overflow-x-auto border">
      <table className="w-full min-w-[420px] text-left text-sm">
        <caption className="sr-only">Which membership opens each tool</caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="text-text-label px-4 py-3 text-xs font-medium uppercase">
              Tool
            </th>
            <th scope="col" className="text-text w-28 px-4 py-3 text-center font-semibold">
              Silver
            </th>
            <th scope="col" className="text-text w-28 px-4 py-3 text-center font-semibold">
              Diamond
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.id} className="border-border border-b last:border-b-0">
            <tr>
              <th
                scope="rowgroup"
                colSpan={3}
                className="text-caption text-text-label bg-surface-2 px-4 py-2 font-medium tracking-[0.1em] uppercase"
              >
                {group.label}
              </th>
            </tr>
            {group.items.map((item) => {
              const silver = moduleTier(item.path) === 'silver'
              return (
                <tr key={item.path} className="border-border border-t first:border-t-0">
                  <th scope="row" className="text-text-2 px-4 py-2.5 font-normal">
                    {item.label}
                  </th>
                  <td className="px-4 py-2.5 text-center">
                    <Included yes={silver} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Included yes />
                  </td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function Included({ yes }: { yes: boolean }) {
  return yes ? (
    <>
      <Check aria-hidden className="text-success inline size-4" />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <Minus aria-hidden className="text-text-3 inline size-4" />
      <span className="sr-only">Not included</span>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Questions
 * ------------------------------------------------------------------ */

/** Questions that open in place. The chevron is the only sign — the marker is hidden. */
export function FaqList({ items, openFirst = false }: { items: Faq[]; openFirst?: boolean }) {
  return (
    <div className="divide-border rounded-card border-border bg-surface mt-4 divide-y overflow-hidden border">
      {items.map((faq, index) => (
        <details key={faq.q} open={openFirst && index === 0} className="group">
          <summary
            className={cn(
              'text-text hover:bg-surface-2 focus-visible:outline-text-2 flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-sm font-medium marker:hidden',
              'focus-visible:outline-2 focus-visible:-outline-offset-2',
            )}
          >
            <span>{faq.q}</span>
            <ChevronDown
              aria-hidden
              className="text-text-3 mt-0.5 size-4 shrink-0 transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <p className="text-text-2 px-4 pb-4 text-sm">{faq.a}</p>
        </details>
      ))}
    </div>
  )
}
