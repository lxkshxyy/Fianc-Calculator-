import { describe, expect, it } from 'vitest'

import {
  debtToIncome,
  emergencyFundMonths,
  healthBand,
  healthScore,
  netWorth,
  safeRatio,
  savingsRate,
  type HealthInput,
} from './metrics'

/**
 * §12 tests the two areas that carry real risk. money.ts is one; this is the
 * other half of it — every guarded ratio in §8.4, because an unguarded division
 * here is what puts `NaN%` or `Infinity` on the dashboard.
 */

const BLANK: HealthInput = {
  liquidAssets: 0,
  avgMonthlyExpense: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlyEmiTotal: 0,
  termCoverTotal: 0,
  investmentTypeCount: 0,
  hasInsuranceRecords: false,
  hasInvestmentRecords: false,
}

describe('safeRatio', () => {
  it('returns null rather than dividing by zero', () => {
    expect(safeRatio(100, 0)).toBeNull()
  })

  it('returns null for a negative denominator', () => {
    expect(safeRatio(100, -1)).toBeNull()
  })

  it('returns null when either side is not finite', () => {
    expect(safeRatio(Number.NaN, 10)).toBeNull()
    expect(safeRatio(10, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('divides normally when it can', () => {
    expect(safeRatio(30, 120)).toBe(0.25)
  })
})

describe('netWorth', () => {
  it('subtracts liabilities from assets', () => {
    expect(netWorth({ assetsTotal: 250_000, liabilitiesTotal: 1_820_000 })).toBe(-1_570_000)
  })

  it('is zero on a blank slate, not null', () => {
    expect(netWorth({ assetsTotal: 0, liabilitiesTotal: 0 })).toBe(0)
  })
})

describe('savingsRate', () => {
  it('is null with no income — never NaN', () => {
    const rate = savingsRate({ monthlyIncome: 0, monthlyExpenses: 12_000 })
    expect(rate).toBeNull()
    expect(Number.isNaN(rate as unknown as number)).toBe(false)
  })

  it('computes the usual case', () => {
    expect(savingsRate({ monthlyIncome: 100_000, monthlyExpenses: 65_000 })).toBeCloseTo(0.35)
  })

  it('goes negative when spending exceeds income', () => {
    expect(savingsRate({ monthlyIncome: 50_000, monthlyExpenses: 60_000 })).toBeCloseTo(-0.2)
  })
})

describe('debtToIncome and emergencyFundMonths', () => {
  it('both guard a zero denominator', () => {
    expect(debtToIncome(20_000, 0)).toBeNull()
    expect(emergencyFundMonths(500_000, 0)).toBeNull()
  })

  it('compute normally', () => {
    expect(debtToIncome(25_000, 100_000)).toBeCloseTo(0.25)
    expect(emergencyFundMonths(360_000, 60_000)).toBeCloseTo(6)
  })
})

describe('healthScore', () => {
  it('returns null on a completely blank profile instead of scoring zero', () => {
    const result = healthScore(BLANK)
    expect(result.score).toBeNull()
    expect(result.band).toBeNull()
    expect(result.weakest).toBeNull()
    expect(result.components.every((component) => !component.available)).toBe(true)
  })

  it('scores only the components whose inputs exist', () => {
    const result = healthScore({
      ...BLANK,
      monthlyIncome: 100_000,
      monthlyExpenses: 70_000,
      avgMonthlyExpense: 70_000,
      liquidAssets: 420_000,
    })
    // Income, spending and cash are known; insurance and investments are not.
    const available = result.components.filter((component) => component.available)
    expect(available.map((component) => component.id).sort()).toEqual([
      'debtToIncome',
      'emergencyFund',
      'savingsRate',
    ])
    expect(result.score).not.toBeNull()
  })

  it('never exceeds 100 however good the inputs are', () => {
    const result = healthScore({
      liquidAssets: 100_000_000,
      avgMonthlyExpense: 10_000,
      monthlyIncome: 500_000,
      monthlyExpenses: 10_000,
      monthlyEmiTotal: 0,
      termCoverTotal: 10_000_000_000,
      investmentTypeCount: 12,
      hasInsuranceRecords: true,
      hasInvestmentRecords: true,
    })
    expect(result.score).toBe(100)
    expect(result.band).toBe('excellent')
  })

  it('never drops below 0 however bad the inputs are', () => {
    const result = healthScore({
      liquidAssets: 0,
      avgMonthlyExpense: 80_000,
      monthlyIncome: 50_000,
      monthlyExpenses: 90_000,
      monthlyEmiTotal: 45_000,
      termCoverTotal: 0,
      investmentTypeCount: 0,
      hasInsuranceRecords: true,
      hasInvestmentRecords: true,
    })
    expect(result.score).toBe(0)
    expect(result.band).toBe('needsWork')
  })

  it('names the weakest available component as the next action', () => {
    const result = healthScore({
      ...BLANK,
      monthlyIncome: 100_000,
      monthlyExpenses: 40_000,
      avgMonthlyExpense: 40_000,
      liquidAssets: 0,
      monthlyEmiTotal: 0,
    })
    expect(result.weakest?.id).toBe('emergencyFund')
    expect(result.weakest?.hint.length).toBeGreaterThan(0)
  })

  it('reports a score that is a whole number', () => {
    const result = healthScore({
      ...BLANK,
      monthlyIncome: 85_000,
      monthlyExpenses: 61_000,
      avgMonthlyExpense: 61_000,
      liquidAssets: 145_000,
      monthlyEmiTotal: 23_400,
    })
    expect(result.score).not.toBeNull()
    expect(Number.isInteger(result.score)).toBe(true)
  })
})

describe('healthBand', () => {
  it('maps the four §8.4 bands at their boundaries', () => {
    expect(healthBand(0)).toBe('needsWork')
    expect(healthBand(39)).toBe('needsWork')
    expect(healthBand(40)).toBe('gettingThere')
    expect(healthBand(69)).toBe('gettingThere')
    expect(healthBand(70)).toBe('strong')
    expect(healthBand(84)).toBe('strong')
    expect(healthBand(85)).toBe('excellent')
    expect(healthBand(100)).toBe('excellent')
  })
})
