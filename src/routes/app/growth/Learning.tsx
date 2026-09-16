import { GraduationCap, PlayCircle } from 'lucide-react'

import { Meter, RecordList } from '@/components/ui/RecordList'
import { useSnapshot } from '@/data/store/data'
import { STAGES } from '@/domain/journey'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function Learning() {
  const snapshot = useSnapshot()
  if (snapshot === null) return null

  const byStage = STAGES.map((stage) => ({
    stage,
    modules: snapshot.learning.filter((module) => module.stageId === stage.id),
  })).filter((group) => group.modules.length > 0)

  return (
    <ModuleScreen
      title="My Learning"
      subtitle="Short modules tied to the stage you are on, not a course you have to finish first."
      icon={GraduationCap}
    >
      {byStage.length === 0 ? (
        <ModuleSection label="Modules">
          <RecordList
            rows={[]}
            empty={{
              icon: GraduationCap,
              title: 'No modules yet',
              description: 'Lessons appear as your stage unlocks them.',
            }}
          />
        </ModuleSection>
      ) : (
        byStage.map((group) => (
          <ModuleSection key={group.stage.id} label={group.stage.name}>
            <RecordList
              rows={group.modules.map((module) => ({
                id: module.id,
                icon: module.completed ? PlayCircle : GraduationCap,
                title: module.title,
                subtitle: `${String(module.durationMinutes)} min${module.completed ? ' · done' : ''}`,
                footer: (
                  <Meter value={module.progress} tone={module.completed ? 'success' : 'gold'} />
                ),
              }))}
              empty={{ icon: GraduationCap, title: '', description: '' }}
            />
          </ModuleSection>
        ))
      )}
    </ModuleScreen>
  )
}
