import { Target } from 'lucide-react'

import { AddRecordSheet } from '@/components/ui/AddRecordSheet'
import { GOAL_CONSTANTS, GOAL_FIELDS, GOAL_INITIAL, GoalDraft } from '../addForms'
import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSnapshot } from '@/data/store/data'
import { safeRatio } from '@/domain/metrics'
import { EM_DASH } from '@/lib/money'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'
import { EmptyState } from '@/components/ui/EmptyState'

/** Whole months between today and a target date, or null if the date has passed. */
function monthsRemaining(targetDate: string): number | null {
  const target = Date.parse(targetDate)
  if (!Number.isFinite(target)) return null
  const months = (target - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)
  return months <= 0 ? null : Math.ceil(months)
}

export function Goals() {
  const snapshot = useSnapshot()
  if (snapshot === null) return null

  const goals = snapshot.goals.filter((goal) => goal.active)

  return (
    <ModuleScreen
      title="Goals"
      subtitle="What you are saving towards, and what it takes each month to get there."
      icon={Target}
      moduleId="goals"
      action={
        <AddRecordSheet
          collection="goals"
          title="Add a goal"
          description="Something you are saving towards, with an amount and a date."
          buttonLabel="Add goal"
          submitLabel="Save goal"
          fields={GOAL_FIELDS}
          schema={GoalDraft}
          initial={GOAL_INITIAL}
          constants={GOAL_CONSTANTS}
        />
      }
      unlockLine="goal planning"
    >
      <ModuleSection label="Active goals">
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Name something you are saving for and the monthly figure works itself out."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((goal) => {
              const progress = safeRatio(goal.saved, goal.target)
              const months = monthsRemaining(goal.targetDate)
              const shortfall = Math.max(0, goal.target - goal.saved)
              const perMonth = months === null ? null : shortfall / months

              return (
                <Card key={goal.id}>
                  <div className="flex items-start gap-4">
                    <ProgressRing value={progress} label="" size={72} strokeWidth={7} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-text truncate font-semibold">{goal.name}</h3>
                      <p className="text-caption text-text-2 mt-1">
                        <CurrencyText value={goal.saved} size="body" tone="inherit" /> of{' '}
                        <CurrencyText value={goal.target} size="body" tone="inherit" />
                      </p>
                      <div className="mt-3">
                        <SectionLabel>Needed each month</SectionLabel>
                        <p className="text-text mt-1">
                          {perMonth === null ? (
                            <span className="text-text-2">{EM_DASH} target date has passed</span>
                          ) : (
                            <>
                              <CurrencyText value={perMonth} size="lead" tone="inherit" />
                              <span className="text-caption text-text-2 ml-1.5">
                                for {months} months
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {goal.milestones.map((milestone) => {
                      const reached = progress !== null && progress >= milestone
                      return (
                        <span
                          key={milestone}
                          className={
                            reached
                              ? 'bg-gold-dim text-caption text-text rounded-full px-2 py-0.5'
                              : 'border-border text-caption text-text-3 rounded-full border px-2 py-0.5'
                          }
                        >
                          {Math.round(milestone * 100)}%
                        </span>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </ModuleSection>
    </ModuleScreen>
  )
}
