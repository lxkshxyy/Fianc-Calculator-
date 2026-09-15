import type { TaxRateTable } from '@/data/schema'

/**
 * §9.4 — the dated tax config.
 *
 * **This ships empty on purpose.** Slabs, the standard deduction, the rebate and
 * cess change at every Budget. They must be entered from an official source for
 * the assessment year the app is being used in, signed off by the client, and
 * stamped with `assessmentYear` and `sourceNote` so the UI can show a visible
 * "rates as of" line.
 *
 * Do not fill this in from memory or from a model's recollection. A wrong slab
 * is a wrong answer shown with confidence to a real person about their own money.
 *
 * To configure: add one entry per regime, e.g.
 *
 *   {
 *     assessmentYear: '2027-28',
 *     sourceNote: 'Finance Act 2026, as published on incometax.gov.in',
 *     regime: 'new',
 *     slabs: [{ from: 0, to: 400000, rate: 0 }, ...],
 *     standardDeduction: 0,
 *     rebateLimit: 0,
 *     rebateMax: 0,
 *     cessPercent: 4,
 *   }
 */
export const TAX_RATES: TaxRateTable[] = []

export function ratesFor(regime: 'old' | 'new'): TaxRateTable | null {
  return TAX_RATES.find((table) => table.regime === regime) ?? null
}
