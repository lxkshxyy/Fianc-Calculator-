import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { STAGES } from '@/domain/journey'
import { PublicShell } from './PublicShell'

export function About() {
  return (
    <PublicShell>
      <section className="py-12">
        <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Why this exists
        </h1>
        <p className="text-lead text-text-2 mt-4 max-w-prose">
          Most people do not have a money problem so much as a visibility problem. They know roughly
          what comes in, vaguely what goes out, and nothing at all about the gap between the two.
        </p>
        <p className="text-text-2 mt-4 max-w-prose text-sm">
          Every tool here exists to close one part of that gap, in an order that makes sense: see
          where you stand, stop the leaks, build a cushion, then optimise and grow. That order is
          the {STAGES.length} stages, and it is the whole product.
        </p>
      </section>

      <section className="pb-12">
        <SectionLabel>What we will not do</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Card>
            <h2 className="text-text text-sm font-semibold">Guess at your tax</h2>
            <p className="text-caption text-text-2 mt-1.5">
              Slabs change every Budget. Ours come from an official source or the screen says so.
            </p>
          </Card>
          <Card>
            <h2 className="text-text text-sm font-semibold">Invent a testimonial</h2>
            <p className="text-caption text-text-2 mt-1.5">
              Results come from real members, with consent, or the space stays empty.
            </p>
          </Card>
          <Card>
            <h2 className="text-text text-sm font-semibold">Upload your figures</h2>
            <p className="text-caption text-text-2 mt-1.5">
              Your data sits on your device. That is also why it works with no connection.
            </p>
          </Card>
        </div>
      </section>
    </PublicShell>
  )
}
