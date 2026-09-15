/**
 * Loan maths for §9.4's EMI module. Every function guards its denominator —
 * a zero rate, a zero tenure and a fully repaid loan are all reachable states.
 */

/** Months to clear a balance at a given EMI, or `null` when the EMI never clears it. */
export function monthsToClear(outstanding: number, annualRate: number, emi: number): number | null {
  if (outstanding <= 0) return 0
  if (emi <= 0) return null
  const monthlyRate = annualRate / 12 / 100
  if (monthlyRate <= 0) return Math.ceil(outstanding / emi)

  const interestOnly = outstanding * monthlyRate
  /* An EMI at or below the monthly interest never touches the principal. */
  if (emi <= interestOnly) return null

  const months = Math.log(emi / (emi - interestOnly)) / Math.log(1 + monthlyRate)
  return Number.isFinite(months) ? Math.ceil(months) : null
}

/** Total interest paid over the remaining life of a loan, or `null` if it never clears. */
export function remainingInterest(
  outstanding: number,
  annualRate: number,
  emi: number,
): number | null {
  const months = monthsToClear(outstanding, annualRate, emi)
  if (months === null) return null
  return Math.max(0, emi * months - outstanding)
}

export type PrepaymentResult = {
  monthsSaved: number
  interestSaved: number
}

/** What a one-off prepayment buys, or `null` when the comparison is not computable. */
export function prepaymentSaving(
  outstanding: number,
  annualRate: number,
  emi: number,
  prepayment: number,
): PrepaymentResult | null {
  if (prepayment <= 0) return null
  const before = monthsToClear(outstanding, annualRate, emi)
  const interestBefore = remainingInterest(outstanding, annualRate, emi)
  const reduced = Math.max(0, outstanding - prepayment)
  const after = monthsToClear(reduced, annualRate, emi)
  const interestAfter = remainingInterest(reduced, annualRate, emi)
  if (before === null || after === null || interestBefore === null || interestAfter === null) {
    return null
  }
  return {
    monthsSaved: Math.max(0, before - after),
    interestSaved: Math.max(0, interestBefore - interestAfter),
  }
}
