import { KeyRound, MessageCircle, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { PublicShell } from './PublicShell'
import { FaqList, MembershipCards, MembershipTable } from './publicContent'
import { FAQ_GROUPS } from './publicData'

const UPGRADE_STEPS: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: Send,
    title: 'Ask from the app',
    line: 'Membership → Upgrade sends your request to the team with your name and mobile number.',
  },
  {
    icon: MessageCircle,
    title: 'The team confirms on WhatsApp',
    line: 'Someone from the advisory team gets in touch to confirm your membership.',
  },
  {
    icon: KeyRound,
    title: 'Enter your code',
    line: 'An activation code arrives on your registered number. Enter it and Diamond opens.',
  },
]

const MEMBERSHIP_FAQS = FAQ_GROUPS.find((group) => group.id === 'membership')?.items ?? []

/** Silver against Diamond: what each opens, and how to move between them. */
export function Pricing() {
  return (
    <PublicShell title="Pricing">
      <section className="py-12">
        <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Start free. Go further when you are ready.
        </h1>
        <p className="text-lead text-text-2 mt-3 max-w-2xl">
          Silver is free for as long as you use it. Diamond opens the whole ladder and the planning
          tools that come with it.
        </p>
      </section>

      <section className="pb-10" aria-label="Memberships">
        <SectionLabel>Membership</SectionLabel>
        <MembershipCards />
      </section>

      <section className="pb-10" aria-label="What each membership opens">
        <SectionLabel>Compare every tool</SectionLabel>
        <MembershipTable />
      </section>

      <section className="pb-10" aria-label="How upgrading works">
        <SectionLabel>Moving to Diamond</SectionLabel>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {UPGRADE_STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <span className="text-caption text-gold font-mono">{index + 1}</span>
                  <step.icon aria-hidden className="text-gold size-5" />
                </div>
                <h2 className="text-text mt-3 font-semibold">{step.title}</h2>
                <p className="text-text-2 mt-1.5 text-sm">{step.line}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="pb-4" aria-label="Membership questions">
        <SectionLabel>Questions about membership</SectionLabel>
        <FaqList items={MEMBERSHIP_FAQS} openFirst />
        <p className="text-caption text-text-3 mt-4">
          <Link to="/faq" className="rounded-tile text-gold underline underline-offset-2">
            All questions
          </Link>
        </p>
      </section>
    </PublicShell>
  )
}
