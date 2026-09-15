import { Users } from 'lucide-react'

import { RecordList } from '@/components/ui/RecordList'
import { useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function Family() {
  const snapshot = useSnapshot()
  if (snapshot === null) return null

  return (
    <ModuleScreen
      title="Family"
      subtitle="Who else this plan has to work for."
      icon={Users}
      moduleId="family"
      unlockLine="household planning"
    >
      <ModuleSection label="Members">
        <RecordList
          rows={snapshot.family.map((member) => ({
            id: member.id,
            icon: Users,
            title: member.name,
            subtitle: member.relation,
            meta: member.includeInHousehold ? 'Counted in household totals' : 'Not counted',
          }))}
          empty={{
            icon: Users,
            title: 'Nobody added',
            description: 'Add the people who depend on this money, and cover targets adjust.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
