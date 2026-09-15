import { describe, expect, it } from 'vitest'

import { monthsToClear, prepaymentSaving, remainingInterest } from './loan'

describe('loan maths', () => {
  it('returns zero months for a cleared loan', () => {
    expect(monthsToClear(0, 9, 10_000)).toBe(0)
  })

  it('returns null when the EMI never clears the interest', () => {
    // ₹15.7L at 8.65% accrues about ₹11,300 a month in interest alone.
    expect(monthsToClear(1_570_000, 8.65, 5_000)).toBeNull()
    expect(remainingInterest(1_570_000, 8.65, 5_000)).toBeNull()
  })

  it('returns null for a zero or negative EMI rather than dividing by it', () => {
    expect(monthsToClear(100_000, 9, 0)).toBeNull()
    expect(monthsToClear(100_000, 9, -1)).toBeNull()
  })

  it('handles a zero interest rate without dividing by zero', () => {
    expect(monthsToClear(120_000, 0, 10_000)).toBe(12)
  })

  it('computes a plausible tenure', () => {
    const months = monthsToClear(1_570_000, 8.65, 16_200)
    expect(months).not.toBeNull()
    expect(months).toBeGreaterThan(100)
    expect(months).toBeLessThan(250)
  })

  it('shows a prepayment saving both months and interest', () => {
    const result = prepaymentSaving(1_570_000, 8.65, 16_200, 200_000)
    expect(result).not.toBeNull()
    expect(result?.monthsSaved).toBeGreaterThan(0)
    expect(result?.interestSaved).toBeGreaterThan(0)
  })

  it('returns null for a zero prepayment instead of a meaningless zero saving', () => {
    expect(prepaymentSaving(1_570_000, 8.65, 16_200, 0)).toBeNull()
  })

  it('never reports a negative saving', () => {
    const result = prepaymentSaving(100_000, 9, 9_000, 5_000_000)
    expect(result?.interestSaved).toBeGreaterThanOrEqual(0)
    expect(result?.monthsSaved).toBeGreaterThanOrEqual(0)
  })
})
