import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  type LucideIcon,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { Meter, RecordList } from '@/components/ui/RecordList'
import { monthKey, todayIso, type TransactionKind } from '@/data/schema'
import { useData, useDerived, useSnapshot, useSourceName } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const KIND_ICON: Record<TransactionKind, LucideIcon> = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  investment: TrendingUp,
  transfer: ArrowLeftRight,
}

const KIND_LABEL: Record<TransactionKind, string> = {
  income: 'Money in',
  expense: 'Spent',
  investment: 'Invested',
  transfer: 'Transfer',
}

/** A month's list can be long; past this many rows it stops being readable. */
const MAX_ROWS = 100

/** "2026-09-07" → "7 Sep". Falls back to the raw value rather than throwing. */
function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM')
  } catch {
    return iso
  }
}

export function Budget() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  const removeRecord = useData((state) => state.remove)
  const sourceName = useSourceName()
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

  /*
   * Every line of the month, newest first — what a statement read on Documents
   * brought in, and what was added by hand. Without it an imported statement
   * showed only as a total and its recurring lines, with no way to check a
   * single row against the paper.
   */
  const categoryName = new Map(snapshot.categories.map((category) => [category.id, category.name]))
  const monthLines = snapshot.transactions
    .filter((txn) => monthKey(txn.date) === thisMonth)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
  const shownLines = monthLines.slice(0, MAX_ROWS)

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
            description:
              'Give each category a monthly limit and overspending becomes visible early.',
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
            description:
              'Rent, subscriptions and utilities are marked automatically as you add them.',
          }}
        />
      </ModuleSection>

      <ModuleSection
        label={
          monthLines.length > shownLines.length
            ? `This month's transactions · latest ${String(MAX_ROWS)} of ${String(monthLines.length)}`
            : `This month's transactions · ${String(monthLines.length)}`
        }
      >
        <RecordList
          rows={shownLines.map((txn) => {
            const category = txn.categoryId === null ? undefined : categoryName.get(txn.categoryId)
            return {
              id: txn.id,
              icon: KIND_ICON[txn.kind],
              title: txn.note.length > 0 ? txn.note : KIND_LABEL[txn.kind],
              subtitle: [shortDate(txn.date), KIND_LABEL[txn.kind], category]
                .filter((part) => part !== undefined)
                .join(' · '),
              /* Money in reads as a plain figure, money out as a negative one. */
              value: (
                <CurrencyText
                  value={txn.kind === 'income' ? txn.amount : -txn.amount}
                  variant="full"
                  size="body"
                />
              ),
              deleteLabel: txn.note.length > 0 ? txn.note : KIND_LABEL[txn.kind],
              source: sourceName(txn),
            }
          })}
          onDelete={(id) => {
            void removeRecord('transactions', id)
          }}
          empty={{
            icon: ReceiptText,
            title: 'Nothing this month yet',
            description:
              'Upload a bank statement on Documents, or add spending from the dashboard, and each line shows here.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
