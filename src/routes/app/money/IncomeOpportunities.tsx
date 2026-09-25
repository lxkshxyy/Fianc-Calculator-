import { Sparkles } from 'lucide-react'

import { RecordList } from '@/components/ui/RecordList'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/**
 * Curated side-income ideas. Static content rather than stored records — there
 * is nothing user-specific to persist yet, and §13 forbids inventing a backend
 * to serve a list of suggestions.
 */
const IDEAS: { id: string; title: string; effort: string; horizon: string }[] = [
  {
    id: 'freelance',
    title: 'Freelance your day-job skill',
    effort: 'High effort',
    horizon: 'Weeks to first rupee',
  },
  {
    id: 'tutoring',
    title: 'Tutor a subject you already know',
    effort: 'Medium effort',
    horizon: 'Days to first rupee',
  },
  {
    id: 'rent-asset',
    title: 'Rent out something you already own',
    effort: 'Low effort',
    horizon: 'Weeks',
  },
  {
    id: 'content',
    title: 'Build an audience around one narrow topic',
    effort: 'High effort',
    horizon: 'Months',
  },
  {
    id: 'deposits',
    title: 'Move idle cash into a higher-interest deposit',
    effort: 'Low effort',
    horizon: 'Immediate',
  },
]

export function IncomeOpportunities() {
  return (
    <ModuleScreen
      title="Income Opportunities"
      subtitle="Ways to add a second income, sorted by how much of your time they cost."
      icon={Sparkles}
      moduleId="income-opportunities"
      unlockLine="the curated income ideas"
    >
      <ModuleSection label="Ideas">
        <RecordList
          rows={IDEAS.map((idea) => ({
            id: idea.id,
            icon: Sparkles,
            title: idea.title,
            /* One line under the idea rather than a right-hand column: the column
               squeezed every idea down to its first two words on a phone. */
            subtitle: `${idea.effort} · ${idea.horizon}`,
          }))}
          empty={{
            icon: Sparkles,
            title: 'Nothing here yet',
            description: 'Ideas appear once your stage unlocks them.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
