import { describe, expect, it } from 'vitest'

import {
  displayDateToIso,
  extractFields,
  guessKind,
  keepText,
  looksFinancial,
  MAX_KEPT_TEXT,
  parseAmountText,
  parseDate,
  parseMonths,
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

  it('recovers a rupee sign that OCR read as another symbol', () => {
    /* A photographed "₹50,00,000" came back from OCR as "%50,00,000". */
    expect(parseAmountText('%50,00,000 (Rupees Fifty Lakh only)')).toBe(5_000_000)
    expect(parseAmountText('=1,20,000')).toBe(120_000)
    expect(field('Sum Assured %50,00,000\nAnnual Premium 14,200', 'cover')).toContain('50,00,000')
    /* It still has to be printed like money. */
    expect(parseAmountText('%20')).toBeNull()
    expect(parseAmountText('Share 100%')).toBeNull()
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

/** A detail as suggestFromText gives it, kind-specific ones included. */
function detail(text: string, key: string): string | undefined {
  return suggestFromText(text).fields.find((entry) => entry.key === key)?.value
}

const SALARY_SLIP = `
D Demo Tech Solutions Pvt. Ltd. Salary Slip
Salary slip for the month of September 2026
Employee Name Mr. Aarav Mehta
Basic 50,000.00 Provident Fund (EPF) 6,000.00
House Rent Allowance (HRA) 20,000.00 Income Tax (TDS) 8,250.00
Gross Earnings 1,05,000.00 Total Deductions 14,450.00
Net Pay ₹90,550.00
`

const BANK_STATEMENT = `
Demo Bank Ltd. Account Statement
Account No. 50100123456789 IFSC DEMO0001234
Statement Period 01 Sep 2026 to 28 Sep 2026
Opening Balance ₹1,12,450.00
Date Narration Withdrawal Deposit Balance
02 Sep 2026 NACH RENT SEP FLAT 402 24,000.00 88,450.00
Closing Balance ₹88,450.00
`

describe('a salary slip', () => {
  it('is recognised, with the employer, the period and both pay figures', () => {
    const suggestion = suggestFromText(SALARY_SLIP)
    expect(suggestion.kind).toBe('salary-slip')
    /* The logo's "D" is not part of the name. */
    expect(detail(SALARY_SLIP, 'employer')).toBe('Demo Tech Solutions')
    expect(detail(SALARY_SLIP, 'payPeriod')).toBe('Sep 2026')
    expect(detail(SALARY_SLIP, 'grossPay')).toContain('1,05,000')
    expect(detail(SALARY_SLIP, 'netPay')).toContain('90,550')
    expect(suggestion.name).toBe('Demo Tech Solutions salary slip')
    expect(suggestion.tags).toEqual(['salary slip'])
  })
})

describe('a bank statement', () => {
  it('is recognised, named after the bank, with its period and balances', () => {
    const suggestion = suggestFromText(BANK_STATEMENT)
    expect(suggestion.kind).toBe('bank-statement')
    expect(suggestion.name).toBe('Demo Bank statement')
    expect(detail(BANK_STATEMENT, 'period')).toBe('01 Sep 2026 to 28 Sep 2026')
    expect(detail(BANK_STATEMENT, 'closingBalance')).toContain('88,450')
    /* A rent line is not a reason to tag it "home loan" or anything else. */
    expect(suggestion.tags).toEqual(['bank statement'])
  })
})

describe('a Form 16, in full', () => {
  it('reads the employer from its label, not the section heading above it', () => {
    const form = `FORM NO. 16\nAssessment Year 2026-27\nEMPLOYER AND EMPLOYEE\nName and address of the Employer Demo Tech Solutions Pvt. Ltd., Noida\nTAN of the Employer DELD12345E\n1. Gross Salary 12,60,000.00\nDeductions under section 80C and 80D\n(a) Section 80C - EPF, PPF 1,72,000.00 1,50,000.00\n(c) Section 80D - health insurance premia 25,000.00 25,000.00`
    expect(detail(form, 'employer')).toBe('Demo Tech Solutions')
    expect(detail(form, 'grossSalary')).toContain('12,60,000')
    /* The deductible column, and not the heading that names the sections. */
    expect(detail(form, 'ded80C')).toContain('1,50,000')
    expect(detail(form, 'ded80D')).toContain('25,000')
    expect(suggestFromText(form).tags).not.toContain('health')
  })
})

describe('months', () => {
  it('reads a term in months or years', () => {
    expect(parseMonths('240 months')).toBe(240)
    expect(parseMonths('20 years')).toBe(240)
    expect(parseMonths('186')).toBe(186)
    expect(parseMonths('none')).toBeNull()
  })
})

describe('whether a file is financial', () => {
  function financial(text: string): boolean {
    return looksFinancial(text, suggestFromText(text))
  }

  it('accepts policies, slips, statements and ID papers', () => {
    expect(financial(TERM_SCHEDULE)).toBe(true)
    expect(financial(SALARY_SLIP)).toBe(true)
    expect(financial(BANK_STATEMENT)).toBe(true)
    expect(financial('Government of India\nAadhaar\n2345 6789 0123')).toBe(true)
  })

  it('accepts a money paper it has no name for, like a utility bill', () => {
    const bill =
      'Electricity bill\nConsumer account 1234567\nAmount payable ₹2,150.00\nDue date 15 Oct 2026\nPay by UPI or net banking. Late payment surcharge applies.'
    expect(financial(bill)).toBe(true)
  })

  it('turns away a recipe, a menu, and a photo with no words', () => {
    const recipe =
      'Vegetable Poha\nServes 4 · 20 minutes\nFlattened rice 2 cups\nOnion, chopped 1 medium\nRinse the poha and leave it to soften for five minutes.'
    const menu =
      'Sunday Cafe\nPaneer tikka ₹250\nMasala dosa ₹180\nFilter coffee ₹60\nGST extra as applicable. Ask for the bill at the counter.'
    expect(financial(recipe)).toBe(false)
    expect(financial(menu)).toBe(false)
    expect(financial('')).toBe(false)
    expect(financial('~ ~ ,. II l1 |')).toBe(false)
  })
})

describe('who issued it', () => {
  it('reads the issuer from the letterhead, not from a UPI handle in a row', () => {
    const statement = `Demo Bank Ltd.\nAccount Statement\nOpening Balance ₹1,000.00\nClosing Balance ₹514.00\nWithdrawal Deposit IFSC DEMO0001234\n06/09/26 UPI-ZOMATO-zomato@hdfcbank 486.00 514.00\n07/09/26 NEFT CR-ICICI BANK REFUND 10.00 524.00`
    const suggestion = suggestFromText(statement)
    expect(suggestion.kind).toBe('bank-statement')
    expect(suggestion.fields.some((field) => field.key === 'provider')).toBe(false)
    expect(suggestion.name).toBe('Demo Bank statement')
  })

  it('stops a name where the next column’s label starts', () => {
    expect(field('Customer Name Mr. Aarav Mehta Account No. 50100123456789', 'holder')).toBe(
      'Aarav Mehta',
    )
  })
})
