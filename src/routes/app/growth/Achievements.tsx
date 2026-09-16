import { Award, Lock } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { Meter } from '@/components/ui/RecordList'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Achievement } from '@/data/schema'
import { useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function Achievements() {
  const snapshot = useSnapshot()
  if (snapshot === null) return null

  const earned = snapshot.achievements.filter((entry) => entry.earnedOn !== null)
  const pending = snapshot.achievements.filter((entry) => entry.earnedOn === null)

  function grid(entries: Achievement[], locked: boolean) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-start gap-3">
              <span
                className={
                  locked
                    ? 'rounded-tile bg-surface-2 text-text-3 p-2'
                    : 'rounded-tile bg-gold-dim text-text p-2'
                }
              >
                {locked ? (
                  <Lock aria-hidden className="size-4" />
                ) : (
                  <Award aria-hidden className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-text text-sm font-medium">{entry.title}</h3>
                <p className="text-caption text-text-2 mt-1">{entry.description}</p>
                {locked ? (
                  <div className="mt-3">
                    <Meter value={entry.progress} />
                    <p className="text-caption text-text-3 mt-1.5">
                      {Math.round(entry.progress * 100)}% there
                    </p>
                  </div>
                ) : (
                  <p className="text-caption text-text-3 mt-2">Earned {entry.earnedOn}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <ModuleScreen
      title="Achievements"
      subtitle="What you have already done, and what is within reach."
      icon={Award}
    >
      {snapshot.achievements.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nothing yet"
          description="Badges appear as you complete stage tasks and keep your streak going."
        />
      ) : (
        <>
          <ModuleSection label={`Earned · ${String(earned.length)}`}>
            {earned.length === 0 ? (
              <p className="text-text-2 text-sm">None yet. The first one is the easiest.</p>
            ) : (
              grid(earned, false)
            )}
          </ModuleSection>
          {pending.length === 0 ? null : (
            <ModuleSection label="Still to come">{grid(pending, true)}</ModuleSection>
          )}
        </>
      )}
      <div className="sr-only">
        <SectionLabel>End of achievements</SectionLabel>
      </div>
    </ModuleScreen>
  )
}
