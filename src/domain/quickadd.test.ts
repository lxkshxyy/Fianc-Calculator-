import { describe, expect, it } from 'vitest'

import { isEmptyDraft, parseQuickAdd } from './quickadd'

/**
 * §12 names the quick-add parser as one of the two tested areas: each verb
 * class, each amount form, and the unparseable case.
 *
 * The rule that matters most is the last one. A parser that returns 0 for input
 * it did not understand writes a real transaction of the wrong amount; returning
 * null makes the confirm sheet ask.
 */

describe('parseQuickAdd — verb classes', () => {
  it('reads an expense', () => {
    const draft = parseQuickAdd('paid 15k rent')
    expect(draft.kind).toBe('expense')
    expect(draft.amount).toBe(15_000)
    expect(draft.categoryName).toBe('Rent')
    expect(draft.confidence.kind).toBe(true)
  })

  it('reads income', () => {
    const draft = parseQuickAdd('received 85000 salary')
    expect(draft.kind).toBe('income')
    expect(draft.amount).toBe(85_000)
  })

  it('reads an investment', () => {
    const draft = parseQuickAdd('invested 10k in mutual funds')
    expect(draft.kind).toBe('investment')
    expect(draft.amount).toBe(10_000)
  })

  it('prefers investment over expense when both verbs appear', () => {
    expect(parseQuickAdd('paid sip of 5000').kind).toBe('investment')
  })

  it('defaults to expense but flags the guess when no verb is present', () => {
    const draft = parseQuickAdd('2500 groceries')
    expect(draft.kind).toBe('expense')
    expect(draft.confidence.kind).toBe(false)
    expect(draft.amount).toBe(2_500)
  })
})

describe('parseQuickAdd — amount forms', () => {
  const cases: [string, number][] = [
    ['spent 850 on coffee', 850],
    ['paid 15k rent', 15_000],
    ['paid 15K rent', 15_000],
    ['invested 1.5L in ppf', 150_000],
    ['bought gold worth 2cr', 20_000_000],
    ['bought gold worth 2 Cr', 20_000_000],
    ['paid ₹15000 rent', 15_000],
    ['paid 15,000 rent', 15_000],
    ['paid 1.5 lakh for fees', 150_000],
  ]

  it.each(cases)('reads %s', (input, expected) => {
    expect(parseQuickAdd(input).amount).toBe(expected)
  })
})

describe('parseQuickAdd — the unparseable case', () => {
  it('returns null rather than zero when no amount is present', () => {
    const draft = parseQuickAdd('had a good day')
    expect(draft.amount).toBeNull()
    expect(draft.confidence.amount).toBe(false)
  })

  it('returns null for an empty string', () => {
    expect(parseQuickAdd('').amount).toBeNull()
    expect(isEmptyDraft(parseQuickAdd(''))).toBe(true)
  })

  it('returns null for pure punctuation', () => {
    expect(parseQuickAdd('!!! ???').amount).toBeNull()
  })

  it('keeps whatever it did understand when the amount is missing', () => {
    const draft = parseQuickAdd('paid rent')
    expect(draft.amount).toBeNull()
    expect(draft.kind).toBe('expense')
    expect(draft.categoryName).toBe('Rent')
    expect(isEmptyDraft(draft)).toBe(false)
  })
})

describe('parseQuickAdd — categories and recurrence', () => {
  it('matches a category from a keyword', () => {
    expect(parseQuickAdd('paid 1200 for swiggy').categoryName).toBe('Eating Out')
    expect(parseQuickAdd('spent 450 on petrol').categoryName).toBe('Transport')
    expect(parseQuickAdd('paid 799 netflix').categoryName).toBe('Subscriptions')
  })

  it('leaves the category null when nothing matches', () => {
    const draft = parseQuickAdd('paid 300 to ramesh')
    expect(draft.categoryName).toBeNull()
    expect(draft.confidence.category).toBe(false)
  })

  it('does not categorise income', () => {
    expect(parseQuickAdd('received 5000 rent').categoryName).toBeNull()
  })

  it('detects a recurring hint', () => {
    expect(parseQuickAdd('paid 799 netflix every month').recurring).toBe(true)
    // No hint word, but Subscriptions is a recurring category by nature.
    expect(parseQuickAdd('paid 799 netflix').recurring).toBe(true)
    expect(parseQuickAdd('paid 24000 rent').recurring).toBe(true)
  })

  it('leaves one-off spending non-recurring', () => {
    expect(parseQuickAdd('spent 450 on petrol').recurring).toBe(false)
  })
})

describe('parseQuickAdd — note', () => {
  it('strips the amount and the verb from the note', () => {
    expect(parseQuickAdd('paid 15k rent').note).toBe('rent')
  })

  it('falls back to the category when nothing else is left', () => {
    expect(parseQuickAdd('paid 15k').note).toBe('')
  })
})
