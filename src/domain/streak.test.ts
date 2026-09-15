import { describe, expect, it } from 'vitest'

import { currentStreak } from './streak'

describe('currentStreak', () => {
  it('is zero with no check-ins', () => {
    expect(currentStreak([], '2026-09-14')).toBe(0)
  })

  it('counts a run ending today', () => {
    expect(currentStreak(['2026-09-12', '2026-09-13', '2026-09-14'], '2026-09-14')).toBe(3)
  })

  it('survives today not being checked in yet', () => {
    // The morning of the 14th, before checking in. Yesterday's run still stands.
    expect(currentStreak(['2026-09-12', '2026-09-13'], '2026-09-14')).toBe(2)
  })

  it('breaks once yesterday is missed', () => {
    expect(currentStreak(['2026-09-10', '2026-09-11'], '2026-09-14')).toBe(0)
  })

  it('counts only the run closest to today, not the longest ever', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-09-13', '2026-09-14']
    expect(currentStreak(dates, '2026-09-14')).toBe(2)
  })

  it('handles a month boundary', () => {
    expect(currentStreak(['2026-08-31', '2026-09-01'], '2026-09-01')).toBe(2)
  })

  it('handles a year boundary', () => {
    expect(currentStreak(['2025-12-31', '2026-01-01'], '2026-01-01')).toBe(2)
  })

  it('ignores duplicates and unparseable dates', () => {
    expect(currentStreak(['2026-09-14', '2026-09-14', 'nonsense'], '2026-09-14')).toBe(1)
  })
})
