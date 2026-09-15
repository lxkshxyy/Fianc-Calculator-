import { z } from 'zod'

import { baseFields, IsoDate, NonNegativeMoney, RatePercent } from './common'

export const LoanKind = z.enum(['home', 'car', 'personal', 'education', 'credit-card', 'other'])
export type LoanKind = z.infer<typeof LoanKind>

export const Liability = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: LoanKind,
  principal: NonNegativeMoney,
  outstanding: NonNegativeMoney,
  annualRate: RatePercent,
  emi: NonNegativeMoney,
  /** Months remaining on the schedule. */
  tenureRemaining: z.number().int().nonnegative(),
  startedOn: IsoDate,
})
export type Liability = z.infer<typeof Liability>

/** CIBIL-style score. 300..900, with the date it was read. */
export const CreditScore = z.object({
  ...baseFields,
  score: z.number().int().min(300).max(900),
  recordedOn: IsoDate,
})
export type CreditScore = z.infer<typeof CreditScore>
