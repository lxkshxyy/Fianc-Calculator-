import { CreditCard, Gauge, TrendingDown } from 'lucide-react'
import { useState } from 'react'

import { AddRecordSheet } from '@/components/ui/AddRecordSheet'
import { LIABILITY_FIELDS, LIABILITY_INITIAL, LiabilityDraft } from '../addForms'
import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { NumberField } from '@/components/ui/NumberField'
import { RecordList } from '@/components/ui/RecordList'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useData, useDerived, useSnapshot, useSourceName } from '@/data/store/data'
import { useT } from '@/i18n'
import { prepaymentSaving, remainingInterest } from '@/domain/loan'
import { EM_DASH, formatPercent } from '@/lib/money'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function EmiCredit() {
  const t = useT()
  const snapshot = useSnapshot()
  const removeRecord = useData((state) => state.remove)
  const sourceName = useSourceName()
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
      title={t('nav.emi-credit')}
      subtitle={t('screen.emi-credit.subtitle')}
      icon={CreditCard}
      moduleId="emi-credit"
      action={
        <AddRecordSheet
          collection="liabilities"
          title={t('emi.addTitle')}
          description={t('emi.addDescription')}
          buttonLabel={t('emi.add')}
          submitLabel={t('emi.save')}
          fields={LIABILITY_FIELDS}
          schema={LiabilityDraft}
          initial={LIABILITY_INITIAL}
        />
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label={t('emi.monthlyEmi')}
            icon={CreditCard}
            value={<CurrencyText value={derived.monthlyEmiTotal} size="title" tone="inherit" />}
          />
          <MetricTile
            label={t('emi.shareOfIncome')}
            icon={Gauge}
            value={
              <span className="text-title tabular-nums">{formatPercent(derived.debtToIncome)}</span>
            }
            delta={
              derived.debtToIncome === null
                ? undefined
                : {
                    direction: derived.debtToIncome > 0.2 ? 'up' : 'down',
                    text: derived.debtToIncome > 0.2 ? t('emi.aboveMark') : t('emi.safeRange'),
                    isGood: derived.debtToIncome <= 0.2,
                  }
            }
          />
          <MetricTile
            label={t('emi.creditScore')}
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
      <ModuleSection label={t('emi.loans')}>
        <RecordList
          onSelect={setLoanId}
          rows={snapshot.liabilities.map((loan) => {
            const interest = remainingInterest(loan.outstanding, loan.annualRate, loan.emi)
            return {
              id: loan.id,
              icon: CreditCard,
              title: loan.name,
              subtitle:
                String(loan.annualRate) +
                '% · ' +
                t('emi.monthsLeft', { count: loan.tenureRemaining }),
              value: <CurrencyText value={loan.outstanding} size="body" tone="inherit" />,
              meta:
                interest === null ? (
                  t('emi.notClearing')
                ) : (
                  <>
                    <CurrencyText value={interest} size="body" tone="inherit" />{' '}
                    {t('emi.interestToCome')}
                  </>
                ),
              deleteLabel: loan.name,
              source: sourceName(loan),
            }
          })}
          onDelete={(id) => {
            if (loanId === id) setLoanId(null)
            void removeRecord('liabilities', id)
          }}
          empty={{
            icon: CreditCard,
            title: t('emi.emptyTitle'),
            description: t('emi.emptyBody'),
          }}
        />
      </ModuleSection>

      {selected === null ? null : (
        <ModuleSection label={t('emi.prepayment')}>
          <Card>
            <p className="text-text-2 text-sm">
              {t('emi.prepaymentLead', { name: selected.name })}
            </p>
            <div className="mt-4 max-w-sm">
              <NumberField
                label={t('emi.lumpSum')}
                value={prepayText}
                onValueChange={(raw, parsed) => {
                  setPrepayText(raw)
                  setPrepay(parsed)
                }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-tile bg-surface-2 p-3">
                <SectionLabel>{t('emi.interestSaved')}</SectionLabel>
                <div className="mt-1">
                  {saving === null ? (
                    <span className="text-lead text-text-2">{EM_DASH}</span>
                  ) : (
                    <CurrencyText value={saving.interestSaved} size="lead" tone="inherit" />
                  )}
                </div>
              </div>
              <div className="rounded-tile bg-surface-2 p-3">
                <SectionLabel>{t('emi.monthsSaved')}</SectionLabel>
                <p className="text-lead text-text mt-1 tabular-nums">
                  {saving === null ? EM_DASH : saving.monthsSaved}
                </p>
              </div>
            </div>

            {prepay !== null && saving === null ? (
              <p className="text-caption text-warn mt-3">{t('emi.noSaving')}</p>
            ) : null}
          </Card>
        </ModuleSection>
      )}

      <ModuleSection label={t('emi.creditHistory')}>
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
            title: t('emi.noScoreTitle'),
            description: t('emi.noScoreBody'),
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
