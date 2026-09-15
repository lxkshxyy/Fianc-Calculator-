import { Activity, IndianRupee, PiggyBank, Target } from 'lucide-react'

import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import type { Derived } from '@/domain/derive'
import { EM_DASH, formatPercent } from '@/lib/money'

/** §9.1 item 6 — four tiles, 4 / 2 / 1 across desktop, tablet and phone. */
export function KeyMetrics({ derived }: { derived: Derived }) {
  const savings = derived.savingsRate

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricTile
        label="Monthly income"
        icon={IndianRupee}
        value={<CurrencyText value={derived.monthlyIncome} size="title" tone="inherit" />}
      />
      <MetricTile
        label="Active goals"
        icon={Target}
        value={<span className="text-title tabular-nums">{derived.goalsActive}</span>}
      />
      <MetricTile
        label="Savings rate"
        icon={PiggyBank}
        value={<span className="text-title tabular-nums">{formatPercent(savings)}</span>}
        delta={
          savings === null
            ? undefined
            : { direction: savings >= 0 ? 'up' : 'down', text: 'of income kept', isGood: savings >= 0.2 }
        }
      />
      <MetricTile
        label="Health score"
        icon={Activity}
        value={
          <span className="text-title tabular-nums">
            {derived.health.score === null ? EM_DASH : derived.health.score}
          </span>
        }
      />
    </div>
  )
}
