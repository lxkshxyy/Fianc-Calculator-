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
          <p className="text-text-2 mt-2 text-sm">Education and the fundamentals.</p>
          <ul className="text-text-2 mt-4 space-y-2 text-sm">
            {silverStages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2">
                <Check aria-hidden className="text-success size-4 shrink-0" />
                {stage.name}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Check aria-hidden className="text-success size-4 shrink-0" />
              Budget, income and net worth tracking
            </li>
          </ul>
          {profile.tier === 'silver' ? (
            <p className="text-caption text-text-3 mt-4">Your current plan.</p>
          ) : null}
        </Card>

        <Card className="border-gold-dim">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Diamond</SectionLabel>
            <span className="bg-gold text-caption text-on-gold rounded-full px-2 py-0.5 font-medium">
              Recommended
            </span>
          </div>
          <p className="text-text-2 mt-2 text-sm">The full path, and a person to ask.</p>
          <ul className="text-text-2 mt-4 space-y-2 text-sm">
            {diamondStages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2">
                <Check aria-hidden className="text-gold size-4 shrink-0" />
                {stage.name}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Check aria-hidden className="text-gold size-4 shrink-0" />
              Tax, insurance and investment tools
            </li>
            <li className="flex items-center gap-2">
              <Check aria-hidden className="text-gold size-4 shrink-0" />
              Live chat with a certified advisor
            </li>
          </ul>
          {/*
           * A button that grants Diamond for free, and a line explaining that it
           * does. Both were shown to anybody who opened this screen. They are a
           * developer's way of checking the gated screens, so they are now
           * dev-only: `import.meta.env.DEV` is false in `npm run build`, so this
           * branch is not in the APK at all.
           *
           * What a customer sees instead is below, and it is deliberately not a
           * price: there is no payment provider yet, and inventing one on a
           * screen people can reach is worse than saying so.
           */}
          {import.meta.env.DEV ? (
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
          ) : (
            <p className="text-caption text-text-2 mt-5">
              Diamond is not open for sign-up yet. Everything above is what it will include.
            </p>
          )}
        </Card>
      </div>
    </ModuleScreen>
  )
}
