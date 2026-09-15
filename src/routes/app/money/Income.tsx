import { Banknote, PlusCircle } from 'lucide-react'

import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { useDerived, useSnapshot } from '@/data/store/data'
import { monthlyValue } from '@/data/schema'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const CADENCE_LABEL: Record<string, string> = {
  monthly: 'every month',
  quarterly: 'every quarter',
  annual: 'once a year',
  irregular: 'irregular',
}

export function Income() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  if (snapshot === null || derived === null) return null

  const active = snapshot.incomeSources.filter((source) => source.active)

  return (
    <ModuleScreen
      title="Income"
      subtitle="Every rupee coming in, normalised to a monthly figure so the totals compare."
      icon={Banknote}
      moduleId="income"
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Monthly total"
            icon={Banknote}
            value={<CurrencyText value={derived.monthlyIncome} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Active sources"
            icon={PlusCircle}
            value={<span className="text-title tabular-nums">{active.length}</span>}
          />
          <MetricTile
            label="Annualised"
            icon={Banknote}
            value={<CurrencyText value={derived.monthlyIncome * 12} size="title" tone="inherit" />}
          />
        </div>
      }
    >
      <ModuleSection label="Sources">
        <RecordList
          rows={snapshot.incomeSources.map((source) => ({
            id: source.id,
            icon: Banknote,
            title: source.name,
            subtitle: `${CADENCE_LABEL[source.cadence] ?? source.cadence}${source.active ? '' : ' · paused'}`,
            value: <CurrencyText value={source.amount} size="body" tone="inherit" />,
            meta:
              source.cadence === 'monthly' ? undefined : (
                <>
                  <CurrencyText value={monthlyValue(source)} size="body" tone="inherit" /> / month
                </>
              ),
          }))}
          empty={{
            icon: Banknote,
            title: 'No income recorded',
            description:
              'Add a salary or a side income and your savings rate, tax estimate and stage all start working.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
