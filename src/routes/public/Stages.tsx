import { ArrowUpRight, ListChecks, Unlock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { STAGES, STAGE_COPY_PENDING } from '@/domain/journey'
import { DemoEntry } from './DemoEntry'
import { PublicShell } from './PublicShell'
import { StageCard } from './publicContent'

const HOW: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: ListChecks,
    title: 'Work through the checklist',
    line: 'Each stage is a short list of things worth doing, in the order that helps most.',
  },
  {
    icon: ArrowUpRight,
    title: 'Move up on your own',
    line: 'Tick off the last item and the next stage opens. Nobody has to approve it.',
  },
  {
    icon: Unlock,
    title: 'New tools as you climb',
    line: 'Each stage opens the tools you need for it — no screen full of things you are not ready for.',
  },
]

/** The six stages in full: what each one asks of you, and what it opens. */
export function Stages() {
  return (
    <PublicShell title="The six stages">
      <section className="py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
            Six stages, one step at a time
          </h1>
          {STAGE_COPY_PENDING ? (
            <span className="text-caption text-text-3">Stage names provisional</span>
          ) : null}
        </div>
        <p className="text-lead text-text-2 mt-3 max-w-2xl">
          Everyone starts at stage one. Finish a stage and the next one opens — so the question of
          what to do next with your money always has an answer.
        </p>
      </section>

      <section className="pb-10" aria-label="How the ladder works">
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {HOW.map((item) => (
            <Card key={item.title} className="h-full">
              <item.icon aria-hidden className="text-gold size-5" />
              <h2 className="text-text mt-3 font-semibold">{item.title}</h2>
              <p className="text-text-2 mt-1.5 text-sm">{item.line}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-10" aria-label="The stages">
        <SectionLabel>The ladder</SectionLabel>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {STAGES.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
        <p className="text-caption text-text-3 mt-4">
          Stages 1 and 2 are open on Silver, free. Stages 3 to 6 open on Diamond —{' '}
          <Link to="/pricing" className="rounded-tile text-gold underline underline-offset-2">
            compare memberships
          </Link>
          .
        </p>
      </section>

      <section className="pb-4">
        <Card className="text-center">
          <h2 className="text-text text-title font-semibold text-balance">
            Find out which stage you are on
          </h2>
          <p className="text-text-2 mx-auto mt-2 max-w-md text-sm">
            Six questions, about ten minutes, and the app places you on the ladder.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/auth?mode=signup" className={buttonClass({ variant: 'primary' })}>
              Start free
            </Link>
            <DemoEntry />
          </div>
        </Card>
      </section>
    </PublicShell>
  )
}
