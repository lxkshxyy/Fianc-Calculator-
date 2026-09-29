import {
  Bot,
  CreditCard,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Receipt,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { STAGES, STAGE_COPY_PENDING } from '@/domain/journey'
import { formatCompact } from '@/lib/money'
import { DemoEntry } from './DemoEntry'
import { PublicShell } from './PublicShell'
import { FaqList, MembershipCards, StageLadder } from './publicContent'
import { ALL_FAQS } from './publicData'

const GOAL = STAGES[STAGES.length - 1]?.bandFrom ?? 10_000_000

const TOOLS: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: Wallet,
    title: 'Budget tracking',
    line: 'Every rupee, categorised, with recurring payments spotted for you.',
  },
  {
    icon: TrendingUp,
    title: 'Investment view',
    line: 'What you hold, what it returned, and what the fees quietly cost.',
  },
  {
    icon: Target,
    title: 'Goal planning',
    line: 'Name a target and see the monthly figure that actually gets you there.',
  },
  {
    icon: Receipt,
    title: 'Tax planning',
    line: 'Both regimes side by side, and what you have already claimed.',
  },
  {
    icon: Shield,
    title: 'Insurance gaps',
    line: 'What your family would have, against what they would need.',
  },
  {
    icon: CreditCard,
    title: 'EMI & credit',
    line: 'What each loan really costs, and what paying early would save.',
  },
]

const STEPS = [
  { title: 'Sign up free', line: 'Thirty seconds. No card, no long form.' },
  { title: 'Answer six questions', line: 'One at a time. We place you on the ladder.' },
  { title: 'Take the next step', line: 'One action at a time, in the order that helps most.' },
]

const DIFFERENTIATORS: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'No spreadsheets',
    line: 'A ladder you climb, not a grid you maintain.',
  },
  { icon: Languages, title: 'Hindi or English', line: 'Read it in whichever you think in.' },
  { icon: Sparkles, title: 'Type it like you say it', line: '"paid 15k rent" is a valid entry.' },
  {
    icon: GraduationCap,
    title: 'Learning that fits',
    line: 'Short modules tied to the stage you are on.',
  },
  {
    icon: Bot,
    title: 'Works offline',
    line: 'Your figures stay on your device. Nothing is uploaded.',
  },
  {
    icon: Users,
    title: 'Built for a household',
    line: 'Cover and goals account for the people who depend on you.',
  },
]

export function Landing() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="py-14 sm:py-20">
        <p className="border-border text-caption text-text-2 inline-flex items-center gap-2 rounded-full border px-3 py-1">
          <Sparkles aria-hidden className="text-gold size-3.5" />
          Free to start · no card
        </p>
        <h1 className="text-text mt-5 max-w-3xl text-[clamp(2rem,6vw,3.25rem)] leading-[1.05] font-semibold tracking-tight text-balance">
          Your path to <span className="text-gold">{formatCompact(GOAL)}</span> starts with knowing
          where you stand today
        </h1>
        <p className="text-lead text-text-2 mt-5 max-w-xl">
          Six stages, one step at a time. No spreadsheets, no jargon — just the next thing worth
          doing with your money.
        </p>
        <div className="mt-7 flex flex-wrap items-start gap-3">
          <Link to="/auth?mode=signup" className={buttonClass({ variant: 'primary' })}>
            Start free
          </Link>
          <DemoEntry />
          <Link to="/stages" className={buttonClass({ variant: 'ghost' })}>
            See the six stages
          </Link>
        </div>
        <p className="text-caption text-text-3 mt-3">
          The demo opens a sample household with every screen filled in — no sign-up needed.
        </p>
      </section>

      {/* How it works */}
      <section className="py-10" aria-label="How it works">
        <SectionLabel>How it works</SectionLabel>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <span className="text-caption text-gold font-mono">{index + 1}</span>
                <h3 className="text-text mt-2 font-semibold">{step.title}</h3>
                <p className="text-text-2 mt-1.5 text-sm">{step.line}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Tools */}
      <section className="py-10" aria-label="What you get">
        <SectionLabel>What you get</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Card key={tool.title} className="h-full">
              <tool.icon aria-hidden className="text-gold size-5" />
              <h3 className="text-text mt-3 font-semibold">{tool.title}</h3>
              <p className="text-text-2 mt-1.5 text-sm">{tool.line}</p>
            </Card>
          ))}
        </div>
        <p className="text-caption text-text-3 mt-4">
          <Link to="/features" className="rounded-tile text-gold underline underline-offset-2">
            See every feature
          </Link>
        </p>
      </section>

      {/* Stage ladder */}
      <section id="stages" className="scroll-mt-20 py-10" aria-label="The six stages">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>The six stages</SectionLabel>
          {STAGE_COPY_PENDING ? (
            <span className="text-caption text-text-3">Names provisional</span>
          ) : null}
        </div>

        <StageLadder />
        <p className="text-caption text-text-3 mt-5">
          <Link to="/stages" className="rounded-tile text-gold underline underline-offset-2">
            What each stage asks of you, and what it opens
          </Link>
        </p>
      </section>

      {/* Differentiators */}
      <section className="py-10" aria-label="Why this one">
        <SectionLabel>Why this one</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <Card key={item.title} className="h-full">
              <item.icon aria-hidden className="text-text-2 size-4" />
              <h3 className="text-text mt-3 text-sm font-medium">{item.title}</h3>
              <p className="text-caption text-text-2 mt-1">{item.line}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-10" aria-label="Membership">
        <SectionLabel>Membership</SectionLabel>
        <MembershipCards />
        <p className="text-caption text-text-3 mt-4">
          <Link to="/pricing" className="rounded-tile text-gold underline underline-offset-2">
            Compare every tool, and how to move to Diamond
          </Link>
        </p>
      </section>

      {/* Proof — deliberately not fabricated */}
      <section className="py-10" aria-label="Member results">
        <SectionLabel>Member results</SectionLabel>
        <Card className="mt-4">
          <p className="text-text-2 text-sm">
            Testimonials go here once real members have given them, with their consent and their own
            figures.
          </p>
          <p className="text-caption text-text-3 mt-2">
            This space is intentionally empty. Invented quotes and made-up savings figures are not
            something this build will ship, and a reader can usually tell anyway.
          </p>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-10" aria-label="Questions">
        <SectionLabel>Questions</SectionLabel>
        <FaqList items={ALL_FAQS.slice(0, 5)} openFirst />
        <p className="text-caption text-text-3 mt-4">
          <Link to="/faq" className="rounded-tile text-gold underline underline-offset-2">
            All questions
          </Link>
        </p>
      </section>

      {/* Closing CTA */}
      <section className="py-10">
        <Card className="text-center">
          <h2 className="text-text text-title font-semibold text-balance">
            Start with the first stage
          </h2>
          <p className="text-text-2 mx-auto mt-2 max-w-md text-sm">
            Knowing where you stand takes about ten minutes and costs nothing.
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
