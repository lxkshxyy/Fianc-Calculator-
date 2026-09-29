import { AlertTriangle, PieChart, TrendingUp } from 'lucide-react'

import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { todayIso } from '@/data/schema'
import { useData, useDerived, useSnapshot, useSourceName } from '@/data/store/data'
import { xirr } from '@/domain/xirr'
import { EM_DASH, formatPercent } from '@/lib/money'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/** Above this, an expense ratio is worth flagging to the user. */
const HIGH_EXPENSE_RATIO = 1.0

export function Investments() {
  const snapshot = useSnapshot()
  const removeRecord = useData((state) => state.remove)
  const sourceName = useSourceName()
  const derived = useDerived()
  if (snapshot === null || derived === null) return null

  const today = todayIso()
  const gain = derived.portfolioValue - derived.investedTotal

  const allFlows = snapshot.investments.flatMap((investment) => [
    ...investment.cashflows,
    { date: today, amount: investment.current },
  ])
  const portfolioReturn = xirr(allFlows)

  const expensive = snapshot.investments.filter(
    (investment) =>
      investment.expenseRatio !== null && investment.expenseRatio > HIGH_EXPENSE_RATIO,
  )

  return (
    <ModuleScreen
      title="Investments"
      subtitle="What you hold, what it has returned, and what it quietly costs you in fees."
      icon={TrendingUp}
      moduleId="investments"
      unlockLine="your portfolio analysis"
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Portfolio value"
            icon={TrendingUp}
            value={<CurrencyText value={derived.portfolioValue} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Invested"
            icon={PieChart}
            value={<CurrencyText value={derived.investedTotal} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Gain"
            icon={TrendingUp}
            value={<CurrencyText value={gain} size="title" />}
          />
          <MetricTile
            label="Annualised return"
            icon={TrendingUp}
            value={
              <span className="text-title tabular-nums">
                {portfolioReturn === null ? EM_DASH : formatPercent(portfolioReturn, 1)}
              </span>
            }
          />
        </div>
      }
    >
      <ModuleSection label="Holdings">
        <RecordList
          rows={snapshot.investments.map((investment) => {
            const rate = xirr([
              ...investment.cashflows,
              { date: today, amount: investment.current },
            ])
            return {
              id: investment.id,
              icon: TrendingUp,
              title: investment.name,
              subtitle: `${investment.kind.replace('-', ' ')}${investment.sip ? ' · monthly SIP' : ''}`,
              value: <CurrencyText value={investment.current} size="body" tone="inherit" />,
              meta:
                rate === null ? 'Return not yet computable' : `${formatPercent(rate, 1)} a year`,
              deleteLabel: investment.name,
              source: sourceName(investment),
            }
          })}
          onDelete={(id) => {
            void removeRecord('investments', id)
          }}
          empty={{
            icon: TrendingUp,
            title: 'Nothing invested yet',
            description: 'Add a holding with its dates and the annualised return works itself out.',
          }}
        />
      </ModuleSection>

      {expensive.length === 0 ? null : (
        <ModuleSection label="Worth a look">
          <RecordList
            rows={expensive.map((investment) => ({
              id: `fee-${investment.id}`,
              icon: AlertTriangle,
              title: investment.name,
              subtitle: 'Expense ratio above 1% a year',
              value: (
                <span className="text-body text-warn tabular-nums">
                  {String(investment.expenseRatio)}%
                </span>
              ),
            }))}
            empty={{ icon: AlertTriangle, title: '', description: '' }}
          />
        </ModuleSection>
      )}
    </ModuleScreen>
  )
}
