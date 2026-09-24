import { describe, expect, it } from 'vitest'

import {
  displayDateToIso,
  extractFields,
  guessKind,
  keepText,
  MAX_KEPT_TEXT,
  parseAmountText,
  parseDate,
  suggestFromText,
} from './docscan'

function field(text: string, key: string): string | undefined {
  return extractFields(text).find((entry) => entry.key === key)?.value
}

const TERM_SCHEDULE = `
HDFC Life Insurance Company Limited
POLICY SCHEDULE - HDFC Life Click 2 Protect Super (Term)
Policy No. : 23456789
Name of the Policyholder : MR. RAHUL KUMAR SHARMA
Date of Birth: 14/08/1990
Date of Commencement : 05-03-2024
Sum Assured : Rs. 1,00,00,000
Annual Premium : ₹ 14,750.00
Next Premium Due Date: 05 Mar 2027
Nominee Name : Priya Sharma
`

const PREMIUM_RECEIPT = `
LIFE INSURANCE CORPORATION OF INDIA
RENEWAL PREMIUM RECEIPT
Receipt No 998877665
Policy Number 912345678
Premium Paid Rs.24,300/-
Receipt Date 12.01.2026
`

const FORM_16 = `
FORM NO. 16
Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source (TDS)
Name of the Employee: ASHA VERMA
PAN of the Employee ABCPV1234K
Assessment Year 2025-26
`

describe('dates', () => {
  it('reads Indian numeric dates day-first', () => {
    expect(parseDate('05/03/2024')).toBe('05 Mar 2024')
    expect(parseDate('12.01.2026')).toBe('12 Jan 2026')
    expect(parseDate('5-3-24')).toBe('05 Mar 2024')
  })

  it('reads month names and ISO dates', () => {
    expect(parseDate('05 Mar 2027')).toBe('05 Mar 2027')
    expect(parseDate('5-March-2027')).toBe('05 Mar 2027')
    expect(parseDate('March 5, 2027')).toBe('05 Mar 2027')
    expect(parseDate('2027-03-05')).toBe('05 Mar 2027')
  })

  it('refuses dates that are not on the calendar', () => {
    expect(parseDate('31/02/2026')).toBeNull()
    expect(parseDate('14/13/2026')).toBeNull()
    expect(parseDate('no date here')).toBeNull()
  })

  it('turns a display date back into an ISO date', () => {
    expect(displayDateToIso('05 Mar 2027')).toBe('2027-03-05')
    expect(displayDateToIso('not a date')).toBeNull()
  })
})

describe('amounts', () => {
  it('reads rupee amounts however the rupee is written', () => {
    expect(parseAmountText('Rs. 1,00,00,000')).toBe(10_000_000)
    expect(parseAmountText('₹ 14,750.00')).toBe(14_750)
    expect(parseAmountText('INR 5000')).toBe(5000)
  })

  it('takes a bare figure only when it is printed like money', () => {
    expect(parseAmountText('24,300/-')).toBe(24_300)
    expect(parseAmountText('12500.00')).toBe(12_500)
    /* A receipt or reference number, not an amount. */
    expect(parseAmountText('998877665')).toBeNull()
    expect(parseAmountText('20 years')).toBeNull()
  })
})

describe('a term policy schedule', () => {
  it('finds the details a claim needs', () => {
    expect(field(TERM_SCHEDULE, 'provider')).toBe('HDFC Life')
    expect(field(TERM_SCHEDULE, 'policyNumber')).toBe('23456789')
    expect(field(TERM_SCHEDULE, 'holder')).toBe('Rahul Kumar Sharma')
    /* formatFull groups the Indian way. */
    expect(field(TERM_SCHEDULE, 'cover')).toContain('1,00,00,000')
    expect(field(TERM_SCHEDULE, 'premium')).toContain('14,750')
    expect(field(TERM_SCHEDULE, 'issued')).toBe('05 Mar 2024')
    expect(field(TERM_SCHEDULE, 'due')).toBe('05 Mar 2027')
    expect(field(TERM_SCHEDULE, 'dob')).toBe('14 Aug 1990')
    expect(field(TERM_SCHEDULE, 'nominee')).toBe('Priya Sharma')
  })

  it('is recognised as a policy and named after its insurer', () => {
    const suggestion = suggestFromText(TERM_SCHEDULE)
    expect(suggestion.kind).toBe('insurance-policy')
    expect(suggestion.name).toBe('HDFC Life policy')
    expect(suggestion.tags).toContain('hdfc life')
    expect(suggestion.tags).toContain('term')
  })
})

describe('a premium receipt', () => {
  it('is a receipt, not a policy, even though it names one', () => {
    expect(guessKind(PREMIUM_RECEIPT)).toBe('premium-receipt')
  })

  it('does not mistake the receipt number for the premium', () => {
    expect(field(PREMIUM_RECEIPT, 'provider')).toBe('LIC')
    expect(field(PREMIUM_RECEIPT, 'policyNumber')).toBe('912345678')
    expect(field(PREMIUM_RECEIPT, 'premium')).toContain('24,300')
    expect(field(PREMIUM_RECEIPT, 'issued')).toBe('12 Jan 2026')
  })
})

describe('sensitive numbers', () => {
  it('keeps only the last four digits of a PAN', () => {
    const pan = field(FORM_16, 'pan')
    expect(pan).toBe('•••• 234K')
    expect(extractFields(FORM_16).some((entry) => entry.value.includes('ABCPV'))).toBe(false)
  })

  it('keeps only the last four digits of an Aadhaar number', () => {
    const card = 'Government of India\nAadhaar\n2345 6789 0123'
    expect(field(card, 'aadhaar')).toBe('•••• 0123')
  })

  it('keeps only the last four digits of a bank account', () => {
    expect(field('Account No: 50100234567890', 'account')).toBe('•••• 7890')
  })
})

describe('a tax document', () => {
  it('is recognised, with the assessment year and the employee', () => {
    const suggestion = suggestFromText(FORM_16)
    expect(suggestion.kind).toBe('tax')
    expect(field(FORM_16, 'assessmentYear')).toBe('2025-26')
    expect(field(FORM_16, 'holder')).toBe('Asha Verma')
    expect(suggestion.tags).toContain('form 16')
  })
})

describe('text it cannot place', () => {
  it('falls back to other, with no fields and no invented name', () => {
    const suggestion = suggestFromText('Shopping list\nmilk\nbread')
    expect(suggestion.kind).toBe('other')
    expect(suggestion.fields).toEqual([])
    expect(suggestion.name).toBeNull()
  })

  it('caps the text a record keeps', () => {
    expect(keepText('a '.repeat(MAX_KEPT_TEXT))).toHaveLength(MAX_KEPT_TEXT)
  })
})
