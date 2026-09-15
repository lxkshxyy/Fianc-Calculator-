import { z } from 'zod'

import { baseFields, NonNegativeMoney } from './common'

/**
 * §9.4 — slabs, rates, standard deduction, rebate and cess live in a DATED
 * config stamped with its assessment year, surfaced as a visible "rates as of"
 * line. They are never written from memory: they change at every Budget, this is
 * a financial product, and a wrong slab is a wrong answer shown with confidence
 * to a real person.
 *
 * `TaxRateTable` is the shape that config must take. The app ships with none
 * populated, and the Tax screen renders an explicit "rates not configured" state
 * until the client supplies figures from an official source.
 */
export const TaxSlab = z.object({
  /** Lower bound of the slab, in rupees. */
  from: NonNegativeMoney,
  /** Upper bound, or null for the top slab. */
  to: NonNegativeMoney.nullable(),
  /** Marginal rate as a percentage, e.g. 20 for 20%. */
  rate: z.number().finite().min(0).max(100),
})
export type TaxSlab = z.infer<typeof TaxSlab>

export const TaxRegime = z.enum(['old', 'new'])
export type TaxRegime = z.infer<typeof TaxRegime>

export const TaxRateTable = z.object({
  /** e.g. "2027-28". Displayed verbatim; never computed from the clock. */
  assessmentYear: z.string().min(1),
  /** Shown to the user as the "rates as of" line. */
  sourceNote: z.string().min(1),
  regime: TaxRegime,
  slabs: z.array(TaxSlab),
  standardDeduction: NonNegativeMoney,
  rebateLimit: NonNegativeMoney,
  rebateMax: NonNegativeMoney,
  cessPercent: z.number().finite().min(0).max(100),
})
export type TaxRateTable = z.infer<typeof TaxRateTable>

export const DeductionSection = z.enum(['80C', '80D', '80CCD1B', '80TTA', 'other'])
export type DeductionSection = z.infer<typeof DeductionSection>

export const DeductionEntry = z.object({
  ...baseFields,
  section: DeductionSection,
  label: z.string().min(1),
  amount: NonNegativeMoney,
})
export type DeductionEntry = z.infer<typeof DeductionEntry>

export const TaxProfile = z.object({
  ...baseFields,
  regime: TaxRegime,
  annualGrossIncome: NonNegativeMoney,
})
export type TaxProfile = z.infer<typeof TaxProfile>
