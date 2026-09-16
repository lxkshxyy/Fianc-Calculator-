import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Derived } from '@/domain/derive'
import { useReveal } from '@/lib/useReveal'

/** §9.1 item 5, right half — the two rings. */
export function ProgressCard({ derived }: { derived: Derived }) {
  const reveal = useReveal<HTMLDivElement>()

  return (
    <Card className="h-full">
      <SectionLabel>Progress</SectionLabel>
      <div ref={reveal} className="mt-4 flex items-center justify-around gap-4">
        <ProgressRing
          value={derived.goalsProgress}
          label="Goals"
          caption={derived.goalsActive === 1 ? '1 active' : `${String(derived.goalsActive)} active`}
        />
        <ProgressRing
          value={derived.stageProgress}
          label="Stage"
          caption={derived.stage?.name ?? undefined}
        />
      </div>
    </Card>
  )
}
