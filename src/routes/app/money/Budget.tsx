import { AlertTriangle, RefreshCw, Wallet } from 'lucide-react'

import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { Meter, RecordList } from '@/components/ui/RecordList'
import { monthKey, todayIso } from '@/data/schema'
import { useDerived, useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function Budget() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  if (snapshot === null || derived === null) return null

  const thisMonth = monthKey(todayIso())
  const spentByCategory = new Map<string, number>()
  for (const txn of snapshot.transactions) {
    if (txn.kind !== 'expense' || txn.categoryId === null) continue
    if (monthKey(txn.date) !== thisMonth) continue
    spentByCategory.set(txn.categoryId, (spentByCategory.get(txn.categoryId) ?? 0) + txn.amount)
  }

  const rows = snapshot.budgets.map((budget) => {
    const category = snapshot.categories.find((entry) => entry.id === budget.categoryId)
    const spent = spentByCategory.get(budget.categoryId) ?? 0
    const ratio = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0
    const over = spent > budget.monthlyLimit
    return {
      id: budget.id,
      title: category?.name ?? 'Uncategorised',
      subtitle: over ? 'Over the limit' : undefined,
      value: <CurrencyText value={spent} size="body" tone="inherit" />,
      meta: (
        <>
          of <CurrencyText value={budget.monthlyLimit} size="body" tone="inherit" />
        </>
      ),
      footer: <Meter value={ratio} tone={over ? 'danger' : 'gold'} />,
    }
  })

  const recurring = snapshot.transactions.filter((txn) => txn.recurring && txn.kind === 'expense')
  const recurringMonthly = new Map<string, number>()
  for (const txn of recurring) {
    const key = txn.note.length > 0 ? txn.note : 'Recurring'
    recurringMonthly.set(key, Math.max(recurringMonthly.get(key) ?? 0, txn.amount))
  }

  const overspent = rows.filter((row) => row.subtitle !== undefined).length

  return (
    <ModuleScreen
      title="Budget"
      subtitle="What you planned against what you have actually spent this month."
      icon={Wallet}
      moduleId="budget"
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Spent this month"
            icon={Wallet}
            value={<CurrencyText value={derived.monthlyExpenses} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Typical month"
            icon={RefreshCw}
            value={<CurrencyText value={derived.avgMonthlyExpense} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Over limit"
            icon={AlertTriangle}
            value={<span className="text-title tabular-nums">{overspent}</span>}
            delta={
              overspent > 0
                ? { direction: 'up', text: 'categories need a look', isGood: false }
                : undefined
            }
          />
        </div>
      }
    >
      <ModuleSection label="Categories">
        <RecordList
          rows={rows}
          empty={{
            icon: Wallet,
            title: 'No limits set',
            description: 'Give each category a monthly limit and overspending becomes visible early.',
          }}
        />
      </ModuleSection>

      <ModuleSection label="Detected as recurring">
        <RecordList
          rows={[...recurringMonthly.entries()].map(([name, amount]) => ({
            id: name,
            icon: RefreshCw,
            title: name,
            subtitle: 'Repeats every month',
            value: <CurrencyText value={amount} size="body" tone="inherit" />,
          }))}
          empty={{
            icon: RefreshCw,
            title: 'Nothing recurring yet',
            description: 'Rent, subscriptions and utilities are marked automatically as you add them.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
