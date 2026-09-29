import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { PublicShell } from './PublicShell'
import { FaqList } from './publicContent'
import { FAQ_GROUPS } from './publicData'

/** Every question, grouped, with a way to ask one that is not here. */
export function Faq() {
  return (
    <PublicShell title="FAQ">
      <section className="py-12">
        <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Questions, answered
        </h1>
        <p className="text-lead text-text-2 mt-3 max-w-2xl">
          How it works, where your data lives, and what each membership includes.
        </p>
        <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="border-border text-text-2 hover:border-border-strong hover:text-text rounded-full border px-3 py-1.5 text-sm"
            >
              {group.heading}
            </a>
          ))}
        </nav>
      </section>

      {FAQ_GROUPS.map((group, index) => (
        <section
          key={group.id}
          id={group.id}
          className="scroll-mt-20 pb-10"
          aria-label={group.heading}
        >
          <SectionLabel>{group.heading}</SectionLabel>
          <FaqList items={group.items} openFirst={index === 0} />
        </section>
      ))}

      <section className="pb-4">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-text font-semibold">Still have a question?</h2>
            <p className="text-text-2 mt-1 text-sm">
              The team usually replies within one working day.
            </p>
          </div>
          <Link to="/contact" className={buttonClass({ variant: 'primary' })}>
            Contact us
          </Link>
        </Card>
      </section>
    </PublicShell>
  )
}
