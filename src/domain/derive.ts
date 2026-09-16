import type { Snapshot } from '../data/repo/types'
import { isLiquid, monthKey, monthlyValue, todayIso } from '../data/schema'
import { deriveStageId, stageById, stageProgress, type Stage } from './journey'
import {
  debtToIncome,
  emergencyFundMonths,
  healthScore,
  netWorth,
  safeRatio,
  savingsRate,
  type HealthScore,
  type Ratio,
} from './metrics'

/**
 * One pure function from stored data to every figure a screen renders.
 *
 * It lives in `domain/` rather than in a store so it can be tested without
 * mounting anything, and so no component re-derives a total its own way — the
 * classic source of a dashboard and a module screen disagreeing about net worth.
 */

/** How many complete months of spending the average is taken over. */
const EXPENSE_WINDOW_MONTHS = 3

export type Derived = {
  assetsTotal: number
  liquidAssets: number
  liabilitiesTotal: number
  netWorth: number

  monthlyIncome: number
  monthlyExpenses: number
  avgMonthlyExpense: number
  monthlyEmiTotal: number
  savingsRate: Ratio
  debtToIncome: Ratio
  emergencyFundMonths: Ratio

  investedTotal: number
  portfolioValue: number
  investmentTypeCount: number
  termCoverTotal: number

  goalsActive: number
  goalsProgress: Ratio

  stage: Stage | null
  stageProgress: Ratio
  completedTaskIds: ReadonlySet<string>
  streakCount: number

  health: HealthScore
  latestCreditScore: number | null
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** The month keys of the N complete months before the current one. */
function recentCompleteMonths(today: string, count: number): string[] {
  const [yearPart, monthPart] = today.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return []

  const keys: string[] = []
  for (let back = 1; back <= count; back += 1) {
    const date = new Date(year, month - 1 - back, 1)
    keys.push(`${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function derive(snapshot: Snapshot): Derived {
  const today = todayIso()
  const thisMonth = monthKey(today)

  const assetsTotal = sum(snapshot.assets.map((asset) => asset.value))
  const liquidAssets = sum(snapshot.assets.filter(isLiquid).map((asset) => asset.value))
  const liabilitiesTotal = sum(snapshot.liabilities.map((liability) => liability.outstanding))
  const portfolioValue = sum(snapshot.investments.map((investment) => investment.current))
  const investedTotal = sum(snapshot.investments.map((investment) => investment.invested))

  /* Investments are holdings, not assets rows, so they are added in explicitly. */
  const assetsIncludingInvestments = assetsTotal + portfolioValue

  const monthlyIncome = sum(snapshot.incomeSources.map(monthlyValue))
  const monthlyEmiTotal = sum(snapshot.liabilities.map((liability) => liability.emi))

  const expenses = snapshot.transactions.filter((txn) => txn.kind === 'expense')
  const monthlyExpenses = sum(
    expenses.filter((txn) => monthKey(txn.date) === thisMonth).map((txn) => txn.amount),
  )

  const window = recentCompleteMonths(today, EXPENSE_WINDOW_MONTHS)
  const windowed = expenses.filter((txn) => window.includes(monthKey(txn.date)))
  const monthsWithData = new Set(windowed.map((txn) => monthKey(txn.date))).size
  const avgMonthlyExpense =
    monthsWithData === 0 ? 0 : sum(windowed.map((txn) => txn.amount)) / monthsWithData

  const investmentTypeCount = new Set(snapshot.investments.map((investment) => investment.kind))
    .size
  const termCoverTotal = sum(
    snapshot.policies.filter((policy) => policy.kind === 'term').map((policy) => policy.cover),
  )

  const activeGoals = snapshot.goals.filter((goal) => goal.active)
  const goalTarget = sum(activeGoals.map((goal) => goal.target))
  const goalSaved = sum(activeGoals.map((goal) => goal.saved))

  const completedTaskIds: ReadonlySet<string> = new Set(
    snapshot.stageTasks.map((record) => record.taskId),
  )
  const stageId = deriveStageId(completedTaskIds)
  const stage = stageById(stageId)

  /*
   * The average is taken over complete months only, so it is not skewed by a
   * partial current month — on the 2nd of the month a naive average would show
   * a household spending almost nothing and score a perfect emergency fund.
   */
  const health = healthScore({
    liquidAssets,
    avgMonthlyExpense,
    monthlyIncome,
    monthlyExpenses: avgMonthlyExpense > 0 ? avgMonthlyExpense : monthlyExpenses,
    monthlyEmiTotal,
    termCoverTotal,
    investmentTypeCount,
    hasInsuranceRecords: snapshot.policies.length > 0,
    hasInvestmentRecords: snapshot.investments.length > 0,
  })

  const creditHistory = [...snapshot.creditScores].sort((a, b) =>
    a.recordedOn < b.recordedOn ? 1 : -1,
  )

  return {
    assetsTotal: assetsIncludingInvestments,
    liquidAssets,
    liabilitiesTotal,
    netWorth: netWorth({ assetsTotal: assetsIncludingInvestments, liabilitiesTotal }),

    monthlyIncome,
    monthlyExpenses,
    avgMonthlyExpense,
    monthlyEmiTotal,
    savingsRate: savingsRate({
      monthlyIncome,
      monthlyExpenses: avgMonthlyExpense > 0 ? avgMonthlyExpense : monthlyExpenses,
    }),
    debtToIncome: debtToIncome(monthlyEmiTotal, monthlyIncome),
    emergencyFundMonths: emergencyFundMonths(liquidAssets, avgMonthlyExpense),

    investedTotal,
    portfolioValue,
    investmentTypeCount,
    termCoverTotal,

    goalsActive: activeGoals.length,
    goalsProgress: safeRatio(goalSaved, goalTarget),

    stage,
    stageProgress: stage === null ? null : stageProgress(stage, completedTaskIds),
    completedTaskIds,
    streakCount: snapshot.profile.streakCount,

    health,
    latestCreditScore: creditHistory[0]?.score ?? null,
  }
}
