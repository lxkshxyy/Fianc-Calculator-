import { describe, expect, it } from 'vitest'

import { xirr } from './xirr'

describe('xirr', () => {
  it('returns null for fewer than two flows', () => {
    expect(xirr([])).toBeNull()
    expect(xirr([{ date: '2025-01-01', amount: -1000 }])).toBeNull()
  })

  it('returns null when every flow has the same sign', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -1000 },
        { date: '2026-01-01', amount: -1000 },
      ]),
    ).toBeNull()
  })

  it('returns null when all flows land on the same day', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -1000 },
        { date: '2025-01-01', amount: 1100 },
      ]),
    ).toBeNull()
  })

  it('returns null for an unparseable date rather than NaN', () => {
    const result = xirr([
      { date: 'not-a-date', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ])
    expect(result).toBeNull()
  })

  it('computes a simple one-year 10% return', () => {
    const rate = xirr([
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1100 },
    ])
    expect(rate).not.toBeNull()
    expect(rate).toBeCloseTo(0.1, 2)
  })

  it('computes a loss as a negative rate', () => {
    const rate = xirr([
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 900 },
    ])
    expect(rate).not.toBeNull()
    expect(rate).toBeLessThan(0)
  })

  it('handles a multi-instalment SIP', () => {
    const rate = xirr([
      { date: '2024-01-01', amount: -26_000 },
      { date: '2024-07-01', amount: -26_000 },
      { date: '2025-01-01', amount: -26_000 },
      { date: '2026-01-01', amount: 88_460 },
    ])
    expect(rate).not.toBeNull()
    expect(rate).toBeGreaterThan(0)
    expect(rate).toBeLessThan(1)
  })

  it('never returns NaN or Infinity', () => {
    const rate = xirr([
      { date: '2025-01-01', amount: -1 },
      { date: '2025-01-02', amount: 1_000_000 },
    ])
    if (rate !== null) {
      expect(Number.isFinite(rate)).toBe(true)
    }
  })
})
