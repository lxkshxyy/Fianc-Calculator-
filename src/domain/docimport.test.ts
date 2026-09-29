import { describe, expect, it } from 'vitest'

import { demoSnapshot, emptySnapshot } from '@/data/seed/demo'
import {
  isoOf,
  moneyOf,
  parseHoldings,
  parseStatementRows,
  planImport,
  policyKindOf,
  sameName,
  type ImportContext,
  type ImportItem,
} from './docimport'
import { suggestFromText } from './docscan'

/*
 * Each fixture is what pdf.js hands back for one of the specimen PDFs in
 * "Claude outputs/…/Demo documents": one line per printed row, cells joined by
 * spaces. The plans are checked against a fresh account and against the demo
 * household, which already has a salary, a home loan, a term cover and a flexi
 * cap fund — the cases where a document must update, not duplicate.
 */

const TODAY = '2026-09-29'

const POLICY = `
Demo Life Insurance Co. Ltd. Policy Schedule
Life cover made simple Individual pure term plan
Policy Number DL-TP-2024-58217
Plan Demo Life Term Protect (pure term plan)
Date of Commencement 15 Mar 2024
Next Premium Due Date 15 Mar 2027
Policy Holder's Name Mr. Aarav Mehta
Sum Assured ₹50,00,000 (Rupees Fifty Lakh only)
Annual Premium ₹14,200 (incl. 18% GST)
Premium Payment Mode Yearly
Nominee Name Mrs. Priya Mehta
`

const SALARY_SLIP = `
D Demo Tech Solutions Pvt. Ltd. Salary Slip
Tower B, Sector 62, Noida 201301 Salary slip for the month of September 2026
Employee Name Mr. Aarav Mehta
Pay Period September 2026
PAN ABCPM1234K
Earnings Amount (₹) Deductions Amount (₹)
Basic 50,000.00 Provident Fund (EPF) 6,000.00
House Rent Allowance (HRA) 20,000.00 Professional Tax 200.00
Special Allowance 28,000.00 Income Tax (TDS) 8,250.00
Gross Earnings 1,05,000.00 Total Deductions 14,450.00
Net Pay ₹90,550.00
`

const FORM_16 = `
D Demo Tech Solutions Pvt. Ltd. Form No. 16 - Part B
Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source (TDS) on salary.
EMPLOYER AND EMPLOYEE
Name and address of the Employer Demo Tech Solutions Pvt. Ltd., Sector 62, Noida
TAN of the Employer DELD12345E
Name of the Employee Mr. Aarav Mehta
Assessment Year 2026-27
1. Gross Salary 12,60,000.00
DEDUCTIONS UNDER CHAPTER VI-A
(a) Section 80C - life insurance premia, EPF, PPF 1,72,000.00 1,50,000.00
(b) Section 80CCD(1B) - NPS contribution 50,000.00 50,000.00
(c) Section 80D - health insurance premia 25,000.00 25,000.00
Total tax deducted ₹99,000.00
`

const FUND_STATEMENT = `
D Demo Mutual Fund Account Statement
Investor Name Mr. Aarav Mehta
Statement Date 31 Aug 2026
Demo Flexi Cap Fund - Direct Plan - Growth
Folio No: 5501234/12 Units: 1,245.678 NAV (31 Aug 2026): ₹58.4210
Cost Value: ₹60,000.00 Market Value: ₹72,773.75 SIP: ₹5,000 a month
Demo Short Duration Debt Fund - Direct Plan - Growth
Folio No: 5504455/01 Units: 812.300 NAV (31 Aug 2026): ₹41.2050
Cost Value: ₹30,000.00 Market Value: ₹33,470.82 Lump sum
Total Portfolio Value ₹1,06,244.57
`

const LOAN = `
D Demo Housing Finance Ltd. Home Loan Account Summary
Borrower Name Mr. Aarav Mehta
Loan Account No. HL/2022/0042871
Loan Amount (Sanctioned) ₹25,00,000.00
Date of Disbursement 05 Apr 2022
Rate of Interest 8.50% p.a. (floating)
Loan Tenure 240 months
EMI Amount ₹21,696.00
Balance Tenure 186 months
Principal Outstanding (as on 28 Sep 2026) ₹22,38,801.00
Next EMI Due Date 05 Oct 2026
`

const BANK = `
D Demo Bank Ltd. Account Statement
Customer Name Mr. Aarav Mehta
Account No. 50100123456789
IFSC DEMO0001234
Statement Period 01 Sep 2026 to 28 Sep 2026
Opening Balance ₹1,12,450.00
Date Narration Withdrawal Deposit Balance
01 Sep 2026 NEFT SALARY SEP 2026 DEMO TECH SOLUTIONS 90,550.00 2,03,000.00
02 Sep 2026 NACH RENT SEP FLAT 402 24,000.00 1,79,000.00
05 Sep 2026 SIP DEMO FLEXI CAP FUND 5,000.00 1,74,000.00
07 Sep 2026 UPI SWIGGY ORDER 640.00 1,73,360.00
26 Sep 2026 REFUND AMAZON 499.00 1,73,859.00
Closing Balance ₹1,73,859.00
`

function plan(text: string, context: ImportContext = emptySnapshot()): ImportItem[] {
  const suggestion = suggestFromText(text)
  return planImport(
    { text, kind: suggestion.kind, fields: suggestion.fields, today: TODAY },
    context,
  )
}

function drafts(items: ImportItem[]): Record<string, unknown>[] {
  return items.flatMap((item) =>
    item.actions.flatMap((action) => (action.op === 'create' ? [action.draft] : [])),
  )
}

describe('small readers', () => {
  it('reads back the figures and dates the review step shows', () => {
    expect(moneyOf('₹50,00,000')).toBe(5_000_000)
    expect(moneyOf('₹14,200.50')).toBe(14_200.5)
    expect(moneyOf('')).toBeNull()
    expect(isoOf('15 Mar 2027')).toBe('2027-03-15')
    expect(isoOf('05/04/2022')).toBe('2022-04-05')
  })

  it('matches an issuer by name without mixing up different ones', () => {
    expect(sameName('Demo Life', 'demo life')).toBe(true)
    expect(sameName('Flexi cap fund', 'Demo Flexi Cap Fund - Direct Plan - Growth')).toBe(true)
    expect(sameName('SBI', 'SBI Life')).toBe(false)
    expect(sameName('Index fund SIP', 'Demo Nifty 50 Index Fund')).toBe(false)
  })

  it('tells term cover from health cover', () => {
    expect(policyKindOf('Individual pure term plan')).toBe('term')
    expect(policyKindOf('Family Floater Health Plan')).toBe('family-floater')
    expect(policyKindOf('Mediclaim policy, hospitalisation cover')).toBe('health')
    expect(policyKindOf('Policy Term: 1 year, hospitalisation')).toBe('health')
  })
})

describe('a policy schedule', () => {
  it('becomes a policy on Insurance', () => {
    const items = plan(POLICY)
    expect(items).toHaveLength(1)
    expect(items[0]?.section).toBe('insurance')
    expect(items[0]?.updates).toBe(false)
    expect(drafts(items)[0]).toEqual({
      name: 'Demo Life term cover',
      kind: 'term',
      insurer: 'Demo Life',
      cover: 5_000_000,
      annualPremium: 14_200,
      renewsOn: '2027-03-15',
    })
  })

  it('updates the same cover instead of adding a second one', () => {
    const items = plan(POLICY, demoSnapshot())
    expect(items[0]?.updates).toBe(true)
    expect(items[0]?.title).toBe('Term cover')
    expect(items[0]?.actions[0]).toMatchObject({ op: 'update', collection: 'policies' })
  })

  it('uses the figure as corrected in the review step', () => {
    const suggestion = suggestFromText(POLICY)
    const fields = suggestion.fields.map((field) =>
      field.key === 'cover' ? { ...field, value: '₹75,00,000' } : field,
    )
    const items = planImport(
      { text: POLICY, kind: suggestion.kind, fields, today: TODAY },
      emptySnapshot(),
    )
    expect(drafts(items)[0]?.['cover']).toBe(7_500_000)
  })

  it('turns a monthly premium into a yearly one', () => {
    const monthly = POLICY.replace('Annual Premium ₹14,200', 'Premium ₹1,200').replace(
      'Mode Yearly',
      'Mode Monthly',
    )
    expect(drafts(plan(monthly))[0]?.['annualPremium']).toBe(14_400)
  })
})

describe('a salary slip', () => {
  it('becomes the monthly salary on Income, named after the employer', () => {
    const items = plan(SALARY_SLIP)
    expect(items).toHaveLength(1)
    expect(items[0]?.section).toBe('income')
    expect(drafts(items)[0]).toEqual({
      name: 'Salary — Demo Tech Solutions',
      kind: 'salary',
      amount: 105_000,
      cadence: 'monthly',
      active: true,
    })
  })

  it('updates the one salary already there', () => {
    const items = plan(SALARY_SLIP, demoSnapshot())
    expect(items[0]?.updates).toBe(true)
    expect(items[0]?.detail).toContain('was ₹85,000')
  })
})

describe('a Form 16', () => {
  it('sets the yearly income, the deductions, and a salary when there is none', () => {
    const items = plan(FORM_16)
    expect(items.map((item) => item.section)).toEqual(['tax', 'income', 'tax'])
    expect(items[0]?.actions[0]).toEqual({
      op: 'tax-profile',
      patch: { annualGrossIncome: 1_260_000 },
    })
    expect(drafts(items).filter((draft) => 'section' in draft)).toEqual([
      { section: '80C', label: 'Form 16 — AY 2026-27', amount: 150_000 },
      { section: '80D', label: 'Form 16 — AY 2026-27', amount: 25_000 },
      { section: '80CCD1B', label: 'Form 16 — AY 2026-27', amount: 50_000 },
    ])
    expect(items[1]?.title).toBe('Salary — Demo Tech Solutions')
  })

  it('leaves an existing salary alone', () => {
    expect(plan(FORM_16, demoSnapshot()).some((item) => item.section === 'income')).toBe(false)
  })
})

describe('a fund statement', () => {
  it('lists every scheme with its units, NAV and values', () => {
    expect(parseHoldings(FUND_STATEMENT)).toEqual([
      {
        name: 'Demo Flexi Cap Fund - Direct Plan - Growth',
        kind: 'mutual-fund',
        units: 1245.678,
        nav: 58.421,
        invested: 60_000,
        value: 72_773.75,
        sip: true,
      },
      {
        name: 'Demo Short Duration Debt Fund - Direct Plan - Growth',
        kind: 'mutual-fund',
        units: 812.3,
        nav: 41.205,
        invested: 30_000,
        value: 33_470.82,
        sip: false,
      },
    ])
  })

  it('updates a fund the app already has and adds the rest', () => {
    const items = plan(FUND_STATEMENT, demoSnapshot())
    expect(items.map((item) => [item.title, item.updates])).toEqual([
      ['Flexi cap fund', true],
      ['Demo Short Duration Debt Fund - Direct Plan - Growth', false],
    ])
  })
})

describe('a loan summary', () => {
  it('becomes a loan on EMI & Credit', () => {
    expect(drafts(plan(LOAN))[0]).toEqual({
      name: 'Home loan — Demo Housing Finance',
      kind: 'home',
      principal: 2_500_000,
      outstanding: 2_238_801,
      annualRate: 8.5,
      emi: 21_696,
      tenureRemaining: 186,
      startedOn: '2022-04-05',
    })
  })

  it('updates the one home loan already there', () => {
    const items = plan(LOAN, demoSnapshot())
    expect(items[0]?.updates).toBe(true)
    expect(items[0]?.title).toBe('Home loan')
  })

  it('works out months left from the term when the paper does not print them', () => {
    const noBalance = LOAN.replace('Balance Tenure 186 months\n', '')
    /* 240 months from Apr 2022, 53 of them gone by Sep 2026. */
    expect(drafts(plan(noBalance))[0]?.['tenureRemaining']).toBe(187)
  })
})

describe('a bank statement', () => {
  it('reads which way money moved from the running balance', () => {
    const rows = parseStatementRows(BANK)
    expect(rows.map((row) => [row.date, row.direction, row.amount])).toEqual([
      ['2026-09-01', 'in', 90_550],
      ['2026-09-02', 'out', 24_000],
      ['2026-09-05', 'out', 5000],
      ['2026-09-07', 'out', 640],
      ['2026-09-26', 'in', 499],
    ])
  })

  it('becomes the month on Budget, with SIPs as investments and salary as income', () => {
    const items = plan(BANK)
    const budget = items.find((item) => item.section === 'budget')
    expect(budget?.title).toBe('5 transactions')
    const kinds = drafts(items)
      .filter((draft) => 'date' in draft)
      .map((draft) => [draft['kind'], draft['recurring']])
    expect(kinds).toEqual([
      ['income', true],
      ['expense', true],
      ['investment', true],
      ['expense', false],
      ['income', false],
    ])
    /* No salary on Income yet, so the salary credit offers one. */
    const salary = items.find((item) => item.section === 'income')
    expect(salary?.title).toBe('Salary — Demo Tech Solutions')
  })

  it('keeps "A/C" whole while splitting UPI parts', () => {
    const rows = parseStatementRows(
      'Opening Balance ₹1,000.00\n28/09/26 CREDIT INTEREST SB A/C INT000000928 28/09/26 286.00 1,286.00\n29/09/26 UPI/ZOMATO/412345678903 486.00 800.00',
    )
    expect(rows.map((row) => row.description)).toEqual(['CREDIT INTEREST SB A/C', 'UPI ZOMATO'])
  })

  it('joins wrapped narrations and drops value dates, across a page break', () => {
    const twoPages = `Demo Bank Ltd. Account Statement
Opening Balance ₹84,215.40
Date Narration Chq./Ref.No. Value Dt Withdrawal Deposit Balance
01/09/26 NEFT CR-DEMO TECH SOLUTIONS PVT LTD N2442600123456 01/09/26 90,550.00 1,74,765.40
SALARY SEP 26
19/09/26 FUEL INDIAN OIL SECTOR 18 POS000123458 19/09/26 2,000.00 1,72,765.40
Demo Bank Ltd. is a fictional bank. Every name, number and amount on this page is made up.
D Demo Bank Ltd.
Sector 62 branch, Noida
Account Statement (continued)
Page 2 of 2
Date Narration Chq./Ref.No. Value Dt Withdrawal Deposit Balance
20/09/26 ATM WDL SECTOR 62 NOIDA ATM000556677 20/09/26 5,000.00 1,67,765.40`
    expect(parseStatementRows(twoPages).map((row) => row.description)).toEqual([
      'NEFT CR DEMO TECH SOLUTIONS PVT LTD SALARY SEP 26',
      'FUEL INDIAN OIL SECTOR 18',
      'ATM WDL SECTOR 62 NOIDA',
    ])
  })

  it('files spending under the matching Budget category', () => {
    const context = demoSnapshot()
    const eatingOut = context.categories.find((category) => category.name === 'Eating Out')
    const swiggy = drafts(plan(BANK, context)).find((draft) => draft['note'] === 'UPI SWIGGY ORDER')
    expect(swiggy?.['categoryId']).toBe(eatingOut?.id)
  })

  it('skips transactions already in the app', () => {
    const first = drafts(plan(BANK))
    const context = emptySnapshot()
    context.transactions = first
      .filter((draft) => 'date' in draft)
      .map((draft, index) => ({
        ...(draft as unknown as (typeof context.transactions)[number]),
        id: `txn_${String(index)}`,
        createdAt: 0,
        updatedAt: 0,
      }))
    expect(plan(BANK, context).some((item) => item.section === 'budget')).toBe(false)
  })
})

describe('papers that are only kept', () => {
  it('adds nothing for an ID proof', () => {
    expect(plan('Government of India\nAadhaar\n2345 6789 0123\nPermanent Account Number')).toEqual(
      [],
    )
  })
})
