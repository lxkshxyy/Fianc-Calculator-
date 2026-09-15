import { CreditCard, Gauge, TrendingDown } from 'lucide-react'
import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { NumberField } from '@/components/ui/NumberField'
import { RecordList } from '@/components/ui/RecordList'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useDerived, useSnapshot } from '@/data/store/data'
import { prepaymentSaving, remainingInterest } from '@/domain/loan'
import { EM_DASH, formatPercent } from '@/lib/money'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function EmiCredit() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  const [loanId, setLoanId] = useState<string | null>(null)
  const [prepayText, setPrepayText] = useState('')
  const [prepay, setPrepay] = useState<number | null>(null)

  if (snapshot === null || derived === null) return null

  const selected =
    snapshot.liabilities.find((loan) => loan.id === loanId) ?? snapshot.liabilities[0] ?? null
  const saving =
    selected === null || prepay === null
      ? null
      : prepaymentSaving(selected.outstanding, selected.annualRate, selected.emi, prepay)

  return (
    <ModuleScreen
      title="EMI & Credit"
      subtitle="What you owe, what it costs you, and what paying early would buy."
      icon={CreditCard}
      moduleId="emi-credit"
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Monthly EMI"
            icon={CreditCard}
            value={<CurrencyText value={derived.monthlyEmiTotal} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Share of income"
            icon={Gauge}
            value={
              <span className="text-title tabular-nums">{formatPercent(derived.debtToIncome)}</span>
            }
            delta={
              derived.debtToIncome === null
                ? undefined
                : {
                    direction: derived.debtToIncome > 0.2 ? 'up' : 'down',
                    text: derived.debtToIncome > 0.2 ? 'above the 20% mark' : 'within a safe range',
                    isGood: derived.debtToIncome <= 0.2,
                  }
            }
          />
          <MetricTile
            label="Credit score"
            icon={Gauge}
            value={
              <span className="text-title tabular-nums">
                {derived.latestCreditScore ?? EM_DASH}
              </span>
            }
          />
        </div>
      }
    >
      <ModuleSection label="Loans">
        <RecordList
          onSelect={setLoanId}
          rows={snapshot.liabilities.map((loan) => {
            const interest = remainingInterest(loan.outstanding, loan.annualRate, loan.emi)
            return {
              id: loan.id,
              icon: CreditCard,
              title: loan.name,
              subtitle: `${String(loan.annualRate)}% · ${String(loan.tenureRemaining)} months left`,
              value: <CurrencyText value={loan.outstanding} size="body" tone="inherit" />,
              meta:
                interest === null ? (
                  'Interest not clearing'
                ) : (
                  <>
                    <CurrencyText value={interest} size="body" tone="inherit" /> interest to come
                  </>
                ),
            }
          })}
          empty={{
            icon: CreditCard,
            title: 'No loans recorded',
            description: 'Add a loan to see what it is really costing you over its remaining life.',
          }}
        />
      </ModuleSection>

      {selected === null ? null : (
        <ModuleSection label="Prepayment calculator">
          <Card>
            <p className="text-sm text-text-2">
              If you paid a lump sum off <span className="text-text">{selected.name}</span> today:
            </p>
            <div className="mt-4 max-w-sm">
              <NumberField
                label="Lump sum"
                value={prepayText}
                onValueChange={(raw, parsed) => {
                  setPrepayText(raw)
                  setPrepay(parsed)
                }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-tile bg-surface-2 p-3">
                <SectionLabel>Interest saved</SectionLabel>
                <div className="mt-1">
                  {saving === null ? (
                    <span className="text-lead text-text-2">{EM_DASH}</span>
                  ) : (
                    <CurrencyText value={saving.interestSaved} size="lead" tone="inherit" />
                  )}
                </div>
              </div>
              <div className="rounded-tile bg-surface-2 p-3">
                <SectionLabel>Months saved</SectionLabel>
                <p className="mt-1 text-lead text-text tabular-nums">
                  {saving === null ? EM_DASH : saving.monthsSaved}
                </p>
              </div>
            </div>

            {prepay !== null && saving === null ? (
              <p className="mt-3 text-caption text-warn">
                This EMI does not currently clear the loan, so a saving cannot be worked out.
              </p>
            ) : null}
          </Card>
        </ModuleSection>
      )}

      <ModuleSection label="Credit history">
        <RecordList
          rows={[...snapshot.creditScores]
            .sort((a, b) => (a.recordedOn < b.recordedOn ? 1 : -1))
            .map((entry) => ({
              id: entry.id,
              icon: TrendingDown,
              title: String(entry.score),
              subtitle: entry.recordedOn,
            }))}
          empty={{
            icon: Gauge,
            title: 'No score recorded',
            description: 'Add your score when you check it, and the trend builds itself.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
