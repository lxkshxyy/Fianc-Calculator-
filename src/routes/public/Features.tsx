import { useState } from 'react'
import { Check } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { TierBadge } from '@/components/ui/TierBadge'
import { NAV_GROUPS } from '@/app/nav/navigation'
import { moduleTier } from '@/domain/journey'
import { PublicShell } from './PublicShell'

/**
 * The feature catalogue. Built from the same navigation table the app uses, so
 * the marketing page cannot advertise a module the product does not have.
 */
type Filter = 'all' | 'silver' | 'diamond'

const BULLETS: Record<string, string[]> = {
  income: ['Any cadence, normalised to monthly', 'Active and paused sources', 'Annualised total'],
  'income-opportunities': ['Sorted by effort', 'Time to first rupee', 'Curated, not generated'],
  budget: ['Twelve categories', 'Spent against limit', 'Recurring payments detected'],
  'emi-credit': ['Real remaining interest', 'Prepayment calculator', 'Credit score history'],
  tax: ['Both regimes compared', 'Deduction tracker', 'Rates dated and sourced'],
  investments: ['Annualised return from real dates', 'Allocation by type', 'Expense ratios flagged'],
  goals: ['Monthly figure to hit the date', 'Milestone chips', 'Progress ring'],
  assets: ['What you own', 'What you can reach today', 'Nominee gaps'],
  insurance: ['Cover-gap analysis', 'Renewal calendar', 'Premium totals'],
  learning: ['Tied to your stage', 'Short modules', 'Progress kept'],
  'morning-club': ['Daily check-in', 'Streak that survives a missed morning', 'One line to think about'],
  achievements: ['Earned and pending', 'Progress to the next one', 'No vanity badges'],
  referrals: ['Your own link', 'Who joined', 'Rewards earned'],
  assistant: ['Answers from your own figures', 'Works offline', 'Never invents a number'],
  documents: ['Upload and tag', 'Search by name or tag', 'Ready for a claim'],
  'expert-chat': ['Certified advisors', 'Your figures in context', 'Booking and threads'],
  family: ['Who depends on this money', 'Household totals', 'Shared goals'],
  settings: ['Theme and language', 'Reset or clear your data', 'Membership'],
}

export function Features() {
  const [filter, setFilter] = useState<Filter>('all')

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (filter === 'all') return true
      return moduleTier(item.path) === filter
    }),
  })).filter((group) => group.items.length > 0)

  const total = NAV_GROUPS.reduce((count, group) => count + group.items.length, 0)
  const diamondCount = NAV_GROUPS.reduce(
    (count, group) => count + group.items.filter((item) => moduleTier(item.path) === 'diamond').length,
    0,
  )

  return (
    <PublicShell>
      <section className="py-12">
        <h1 className="text-balance font-semibold text-[clamp(1.75rem,5vw,2.5rem)] text-text tracking-tight">
          Every feature, in one place
        </h1>
        <p className="mt-3 text-lead text-text-2">
          {total} tools across five areas · {diamondCount} open on Diamond
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by membership">
          {(['all', 'silver', 'diamond'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFilter(option)
              }}
              aria-pressed={filter === option}
              className={
                filter === option
                  ? 'rounded-full bg-gold px-3 py-1.5 font-medium text-on-gold text-sm capitalize'
                  : 'rounded-full border border-border px-3 py-1.5 text-sm text-text-2 capitalize hover:border-border-strong'
              }
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.id} className="pb-10" aria-label={group.label}>
          <SectionLabel>{group.label}</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const tier = moduleTier(item.path)
              return (
                <Card key={item.path} className="h-full">
                  <div className="flex items-start justify-between gap-2">
                    <item.icon aria-hidden className="size-5 text-gold" />
                    {tier === 'diamond' ? <TierBadge tier="diamond" /> : null}
                  </div>
                  <h3 className="mt-3 font-semibold text-text">{item.label}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {(BULLETS[item.path] ?? []).map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-caption text-text-2">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </PublicShell>
  )
}
