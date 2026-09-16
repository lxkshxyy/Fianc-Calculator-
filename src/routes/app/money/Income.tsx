import { Banknote, PlusCircle } from 'lucide-react'

import { AddRecordSheet } from '@/components/ui/AddRecordSheet'
import { INCOME_CONSTANTS, INCOME_FIELDS, IncomeDraft } from '../addForms'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { useDerived, useSnapshot } from '@/data/store/data'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import { monthlyValue, type IncomeCadence } from '@/data/schema'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/*
 * Keyed on the cadence union, not `string`. An exhaustive Record means adding a
 * cadence to the schema is a compile error here rather than a row that quietly
 * renders the raw enum value to a user.
 */
const CADENCE_LABEL: Record<IncomeCadence, TranslationKey> = {
  monthly: 'cadence.monthly',
  quarterly: 'cadence.quarterly',
  annual: 'cadence.annual',
  irregular: 'cadence.irregular',
}

export function Income() {
  const t = useT()
  const snapshot = useSnapshot()
  const derived = useDerived()
  if (snapshot === null || derived === null) return null

  const active = snapshot.incomeSources.filter((source) => source.active)

  return (
    <ModuleScreen
      title={t('nav.income')}
      subtitle={t('screen.income.subtitle')}
      icon={Banknote}
      moduleId="income"
      action={
        <AddRecordSheet
          collection="incomeSources"
          title={t('income.addTitle')}
          description={t('income.addDescription')}
          buttonLabel={t('income.add')}
          submitLabel={t('income.save')}
          fields={INCOME_FIELDS}
          schema={IncomeDraft}
          constants={INCOME_CONSTANTS}
        />
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label={t('income.monthlyTotal')}
            icon={Banknote}
            value={<CurrencyText value={derived.monthlyIncome} size="title" tone="inherit" />}
          />
          <MetricTile
            label={t('income.activeSources')}
            icon={PlusCircle}
            value={<span className="text-title tabular-nums">{active.length}</span>}
          />
          <MetricTile
            label={t('income.annualised')}
            icon={Banknote}
            value={<CurrencyText value={derived.monthlyIncome * 12} size="title" tone="inherit" />}
          />
        </div>
      }
    >
      <ModuleSection label={t('income.sources')}>
        <RecordList
          rows={snapshot.incomeSources.map((source) => ({
            id: source.id,
            icon: Banknote,
            title: source.name,
            subtitle: t(CADENCE_LABEL[source.cadence]) + (source.active ? '' : t('cadence.paused')),
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
            title: t('income.emptyTitle'),
            description: t('income.emptyBody'),
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
