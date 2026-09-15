import { CalendarClock, Shield, ShieldAlert } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { Meter, RecordList } from '@/components/ui/RecordList'
import { useDerived, useSnapshot } from '@/data/store/data'
import { safeRatio } from '@/domain/metrics'
import { formatPercent } from '@/lib/money'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/** §8.4 uses the same multiple, so the gap analysis and the health score agree. */
const TERM_COVER_MULTIPLE = 10

export function Insurance() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  if (snapshot === null || derived === null) return null

  const annualIncome = derived.monthlyIncome * 12
  const recommended = annualIncome * TERM_COVER_MULTIPLE
  const coverage = safeRatio(derived.termCoverTotal, recommended)
  const gap = Math.max(0, recommended - derived.termCoverTotal)
  const hasHealth = snapshot.policies.some(
    (policy) => policy.kind === 'health' || policy.kind === 'family-floater',
  )

  return (
    <ModuleScreen
      title="Insurance"
      subtitle="What your family would actually have, measured against what they would need."
      icon={Shield}
      moduleId="insurance"
      unlockLine="the cover-gap analysis"
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Term cover"
            icon={Shield}
            value={<CurrencyText value={derived.termCoverTotal} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Recommended"
            icon={Shield}
            value={<CurrencyText value={recommended} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Covered"
            icon={Shield}
            value={<span className="text-title tabular-nums">{formatPercent(coverage)}</span>}
          />
        </div>
      }
    >
      <ModuleSection label="Cover gap">
        <Card>
          {annualIncome === 0 ? (
            <p className="text-sm text-text-2">
              Add your income first — the recommended cover is a multiple of it, so there is nothing
              to compare against yet.
            </p>
          ) : (
            <>
              <p className="text-sm text-text-2">
                A common rule of thumb is term cover worth {TERM_COVER_MULTIPLE} years of income.
              </p>
              <div className="mt-3">
                <Meter value={coverage ?? 0} tone={gap > 0 ? 'danger' : 'success'} />
              </div>
              <p className="mt-3 text-sm text-text">
                {gap > 0 ? (
                  <>
                    Short by <CurrencyText value={gap} size="lead" tone="inherit" />.
                  </>
                ) : (
                  'Your term cover meets the rule of thumb.'
                )}
              </p>
              {hasHealth ? null : (
                <p className="mt-2 flex items-center gap-2 text-caption text-warn">
                  <ShieldAlert aria-hidden className="size-4" /> No health policy recorded.
                </p>
              )}
              <p className="mt-3 text-caption text-text-3">
                A rule of thumb is not advice. What you need depends on your dependants, debts and
                existing cover — talk to a licensed advisor before buying.
              </p>
            </>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection label="Policies">
        <RecordList
          rows={[...snapshot.policies]
            .sort((a, b) => (a.renewsOn < b.renewsOn ? -1 : 1))
            .map((policy) => ({
              id: policy.id,
              icon: policy.kind === 'term' ? Shield : CalendarClock,
              title: policy.name,
              subtitle: `${policy.insurer} · renews ${policy.renewsOn}`,
              value: <CurrencyText value={policy.cover} size="body" tone="inherit" />,
              meta: (
                <>
                  <CurrencyText value={policy.annualPremium} size="body" tone="inherit" /> a year
                </>
              ),
            }))}
          empty={{
            icon: Shield,
            title: 'No policies recorded',
            description: 'Add your term and health cover to see where the gaps are.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
