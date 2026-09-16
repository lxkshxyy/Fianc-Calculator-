/**
 * §8.4 — derived metrics. Computed, never stored.
 *
 * Every ratio here guards its denominator and returns `null` rather than `NaN`
 * or `Infinity` (§2.1.7). `null` renders as the em dash, which is the honest
 * answer to "what is your savings rate?" when no income has been recorded.
 *
 * The health score is the part §8.4 left uncomputable: it named five weighted
 * components but gave a formula for none of them. Each is defined below as an
 * explicit ratio→points mapping, and each reports whether its inputs were even
 * available, so the UI can say *why* a score is low rather than just showing a
 * number the user cannot act on.
 */

export type Ratio = number | null

/** Clamps to 0..1. Used by every points mapping below. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/** A ratio that is `null` unless the denominator is a usable positive number. */
export function safeRatio(numerator: number, denominator: number): Ratio {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (denominator <= 0) return null
  const result = numerator / denominator
  return Number.isFinite(result) ? result : null
}

export type NetWorthInput = {
  assetsTotal: number
  liabilitiesTotal: number
}

export function netWorth({ assetsTotal, liabilitiesTotal }: NetWorthInput): number {
  return assetsTotal - liabilitiesTotal
}

export type CashflowInput = {
  monthlyIncome: number
  monthlyExpenses: number
}

/** (income − expenses) / income. `null` when no income is recorded. */
export function savingsRate({ monthlyIncome, monthlyExpenses }: CashflowInput): Ratio {
  return safeRatio(monthlyIncome - monthlyExpenses, monthlyIncome)
}

/** Total EMI outgo / income. `null` when no income is recorded. */
export function debtToIncome(monthlyEmiTotal: number, monthlyIncome: number): Ratio {
  return safeRatio(monthlyEmiTotal, monthlyIncome)
}

/** Liquid assets expressed in months of spending. `null` when spending is unknown. */
export function emergencyFundMonths(liquidAssets: number, avgMonthlyExpense: number): Ratio {
  return safeRatio(liquidAssets, avgMonthlyExpense)
}

/* ------------------------------------------------------------------ *
 * Health score
 * ------------------------------------------------------------------ */

export type HealthComponentId =
  'emergencyFund' | 'savingsRate' | 'debtToIncome' | 'insurance' | 'diversification'

export type HealthComponent = {
  id: HealthComponentId
  label: string
  /** Points earned, 0..max. Zero when `available` is false. */
  points: number
  max: number
  /** False when the inputs needed to judge this component have not been entered. */
  available: boolean
  /** One line telling the user what would raise this component. */
  hint: string
}

export type HealthBand = 'needsWork' | 'gettingThere' | 'strong' | 'excellent'

export type HealthScore = {
  /** 0..100, or `null` when not one component had usable inputs. */
  score: number | null
  band: HealthBand | null
  components: HealthComponent[]
  /** The lowest-scoring available component — the single best next action. */
  weakest: HealthComponent | null
}

/** §8.4 weights. They sum to 100. */
const WEIGHTS: Record<HealthComponentId, number> = {
  emergencyFund: 25,
  savingsRate: 25,
  debtToIncome: 20,
  insurance: 15,
  diversification: 15,
}

/** Six months of expenses earns full marks. */
const EMERGENCY_FUND_TARGET_MONTHS = 6
/** Saving 30% of income earns full marks. */
const SAVINGS_RATE_TARGET = 0.3
/** At or below 20% of income to EMIs earns full marks; at or above 50% earns none. */
const DTI_FLOOR = 0.2
const DTI_CEILING = 0.5
/** Term cover of 10x annual income earns full marks. */
const TERM_COVER_MULTIPLE = 10
/** Holding four distinct investment types earns full marks. */
const DIVERSIFICATION_TARGET_TYPES = 4

export type HealthInput = {
  liquidAssets: number
  avgMonthlyExpense: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyEmiTotal: number
  termCoverTotal: number
  /** Count of distinct investment types held. */
  investmentTypeCount: number
  /** False when the user has recorded no policies at all, which is different from ₹0 cover. */
  hasInsuranceRecords: boolean
  /** False when the user has recorded no holdings at all. */
  hasInvestmentRecords: boolean
}

function component(
  id: HealthComponentId,
  label: string,
  ratio: Ratio,
  hint: string,
): HealthComponent {
  const max = WEIGHTS[id]
  if (ratio === null) {
    return { id, label, points: 0, max, available: false, hint }
  }
  return { id, label, points: clamp01(ratio) * max, max, available: true, hint }
}

export function healthScore(input: HealthInput): HealthScore {
  const months = emergencyFundMonths(input.liquidAssets, input.avgMonthlyExpense)
  const savings = savingsRate({
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
  })
  const dti = debtToIncome(input.monthlyEmiTotal, input.monthlyIncome)
  const coverTarget = input.monthlyIncome * 12 * TERM_COVER_MULTIPLE
  const insuranceRatio = input.hasInsuranceRecords
    ? safeRatio(input.termCoverTotal, coverTarget)
    : null
  const diversificationRatio = input.hasInvestmentRecords
    ? clamp01(input.investmentTypeCount / DIVERSIFICATION_TARGET_TYPES)
    : null

  const components: HealthComponent[] = [
    component(
      'emergencyFund',
      'Emergency fund',
      months === null ? null : months / EMERGENCY_FUND_TARGET_MONTHS,
      `Hold ${String(EMERGENCY_FUND_TARGET_MONTHS)} months of spending in cash you can reach today.`,
    ),
    component(
      'savingsRate',
      'Savings rate',
      savings === null ? null : savings / SAVINGS_RATE_TARGET,
      'Keep 30% of what you earn each month.',
    ),
    component(
      'debtToIncome',
      'Debt load',
      dti === null ? null : (DTI_CEILING - dti) / (DTI_CEILING - DTI_FLOOR),
      'Keep EMIs under a fifth of your monthly income.',
    ),
    component(
      'insurance',
      'Insurance cover',
      insuranceRatio,
      `Hold term cover worth ${String(TERM_COVER_MULTIPLE)} years of income.`,
    ),
    component(
      'diversification',
      'Diversification',
      diversificationRatio,
      `Spread holdings across at least ${String(DIVERSIFICATION_TARGET_TYPES)} types.`,
    ),
  ]

  const available = components.filter((entry) => entry.available)
  if (available.length === 0) {
    return { score: null, band: null, components, weakest: null }
  }

  /*
   * Scored out of the weight that was actually measurable, then scaled to 100.
   * Scoring an unavailable component as zero would tell a new user their health
   * is "Needs Work" when the truth is that they have not entered anything yet.
   */
  const earned = available.reduce((sum, entry) => sum + entry.points, 0)
  const possible = available.reduce((sum, entry) => sum + entry.max, 0)
  const scaled = safeRatio(earned, possible)
  const score = scaled === null ? null : Math.round(scaled * 100)

  const weakest = available.reduce<HealthComponent | null>((lowest, entry) => {
    if (lowest === null) return entry
    return entry.points / entry.max < lowest.points / lowest.max ? entry : lowest
  }, null)

  return { score, band: score === null ? null : healthBand(score), components, weakest }
}

export function healthBand(score: number): HealthBand {
  if (score < 40) return 'needsWork'
  if (score < 70) return 'gettingThere'
  if (score < 85) return 'strong'
  return 'excellent'
}

/**
 * §8.4 — the Excellent band is `--success`, distinguished by a filled dot and a
 * check rather than by hue. §4.1 keeps semantic colour separate from the accent,
 * so no band is gold.
 */
export const HEALTH_BAND_LABEL: Record<HealthBand, string> = {
  needsWork: 'Needs Work',
  gettingThere: 'Getting There',
  strong: 'Strong',
  excellent: 'Excellent',
}

/*
 * Deliberately growth metaphors rather than faces. A frowning emoji next to
 * somebody's own finances is a small unkindness for no information gain — these
 * say the same thing about where they are without passing judgement on them.
 */
export const HEALTH_BAND_EMOJI: Record<HealthBand, string> = {
  needsWork: '🌱',
  gettingThere: '🌤️',
  strong: '💪',
  excellent: '🏆',
}

export const HEALTH_BAND_TONE: Record<HealthBand, 'danger' | 'warn' | 'success'> = {
  needsWork: 'danger',
  gettingThere: 'warn',
  strong: 'success',
  excellent: 'success',
}
