import { Check, Gem } from 'lucide-react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useData, useProfile } from '@/data/store/data'
import { STAGES } from '@/domain/journey'
import { ModuleScreen } from './ModuleScreen'

/** §9.5 — the in-app paywall. Two plans, the higher one recommended, no price shown. */
export function Upgrade() {
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  if (profile === null) return null

  const silverStages = STAGES.filter((stage) => stage.tier === 'silver')
  const diamondStages = STAGES.filter((stage) => stage.tier === 'diamond')

  return (
    <ModuleScreen
      title="Membership"
      subtitle="Silver is free and always will be. Diamond opens the rest of the ladder."
      icon={Gem}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionLabel>Silver</SectionLabel>
          <p className="mt-2 text-sm text-text-2">Education and the fundamentals.</p>
          <ul className="mt-4 space-y-2 text-sm text-text-2">
            {silverStages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2">
                <Check aria-hidden className="size-4 shrink-0 text-success" />
                {stage.name}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-success" />
              Budget, income and net worth tracking
            </li>
          </ul>
          {profile.tier === 'silver' ? (
            <p className="mt-4 text-caption text-text-3">Your current plan.</p>
          ) : null}
        </Card>

        <Card className="border-gold-dim">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Diamond</SectionLabel>
            <span className="rounded-full bg-gold px-2 py-0.5 font-medium text-caption text-on-gold">
              Recommended
            </span>
          </div>
          <p className="mt-2 text-sm text-text-2">The full path, and a person to ask.</p>
          <ul className="mt-4 space-y-2 text-sm text-text-2">
            {diamondStages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2">
                <Check aria-hidden className="size-4 shrink-0 text-gold" />
                {stage.name}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-gold" />
              Tax, insurance and investment tools
            </li>
            <li className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-gold" />
              Live chat with a certified advisor
            </li>
          </ul>
          <div className="mt-5">
            <AppButton
              block
              disabled={profile.tier === 'diamond'}
              onClick={() => {
                void saveProfile({ tier: 'diamond' })
              }}
            >
              {profile.tier === 'diamond' ? 'You are on Diamond' : 'Switch to Diamond'}
            </AppButton>
          </div>
          <p className="mt-3 text-caption text-text-3">
            No payment provider is wired up in this build — this switches the tier locally so the
            gated screens can be checked.
          </p>
        </Card>
      </div>
    </ModuleScreen>
  )
}
