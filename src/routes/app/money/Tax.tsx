import { Receipt, ShieldAlert } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { RecordList } from '@/components/ui/RecordList'
import { useData, useSnapshot, useSourceName } from '@/data/store/data'
import { TAX_RATES } from '@/domain/taxConfig'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/**
 * §9.4 — the screen renders an explicit "rates not configured" state until the
 * client supplies figures from an official source.
 *
 * This is deliberate and it is not a stub. Slabs change at every Budget; a wrong
 * one is a wrong answer shown with confidence to someone making a real decision
 * about their own money. An empty config that says so is the honest state.
 */
export function Tax() {
  const snapshot = useSnapshot()
  const removeRecord = useData((state) => state.remove)
  const sourceName = useSourceName()
  if (snapshot === null) return null

  const configured = TAX_RATES.length > 0
  const byDeduction = new Map<string, number>()
  for (const entry of snapshot.deductions) {
    byDeduction.set(entry.section, (byDeduction.get(entry.section) ?? 0) + entry.amount)
  }

  return (
    <ModuleScreen
      title="Tax Planning"
      subtitle="Compare both regimes and track what you have actually claimed."
      icon={Receipt}
      moduleId="tax"
      unlockLine="the regime comparison and deduction tracker"
    >
      {configured ? null : (
        <Card>
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden className="text-warn mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="text-text font-semibold">Tax rates are not configured</h2>
              <p className="text-text-2 mt-1.5 max-w-prose text-sm">
                Slabs, the standard deduction, the rebate and cess change at every Budget, so this
                app ships with none of them filled in. Add the figures for the assessment year from
                an official source in <code className="text-text-2">src/domain/taxConfig.ts</code>,
                and the comparison below starts working.
              </p>
              <p className="text-caption text-text-3 mt-2">
                Nothing here estimates your liability until then — a wrong slab is worse than no
                answer.
              </p>
            </div>
          </div>
        </Card>
      )}

      <ModuleSection label="Regime">
        <Card>
          <p className="text-text-2 text-sm">
            Currently set to{' '}
            <span className="text-text font-medium">
              {snapshot.taxProfile.regime === 'new' ? 'the new regime' : 'the old regime'}
            </span>
            . Deductions below apply only under the old regime.
          </p>
        </Card>
      </ModuleSection>

      <ModuleSection label="Deductions claimed">
        <RecordList
          rows={snapshot.deductions.map((entry) => ({
            id: entry.id,
            icon: Receipt,
            title: entry.label,
            subtitle: entry.section,
            value: <CurrencyText value={entry.amount} size="body" tone="inherit" />,
            deleteLabel: `${entry.label} (${entry.section})`,
            source: sourceName(entry),
          }))}
          onDelete={(id) => {
            void removeRecord('deductions', id)
          }}
          empty={{
            icon: Receipt,
            title: 'Nothing claimed yet',
            description: 'Record a contribution and its section, and the headroom shows up here.',
          }}
        />
        {byDeduction.size === 0 ? null : (
          <p className="text-caption text-text-3 mt-3">
            Headroom needs the section limits, which come with the rate config.
          </p>
        )}
      </ModuleSection>
    </ModuleScreen>
  )
}
