import { z } from 'zod'

import { baseFields, IsoDate, Money, NonNegativeMoney } from './common'

export const InvestmentKind = z.enum([
  'mutual-fund',
  'stock',
  'etf',
  'ppf',
  'nps',
  'bond',
  'unlisted',
  'other',
])
export type InvestmentKind = z.infer<typeof InvestmentKind>

/**
 * One dated movement of money in or out of a holding. Negative is money in
 * (a purchase), positive is money out (a redemption) — the sign convention XIRR
 * expects.
 *
 * Without this, XIRR is not derivable at all: a holding with only `invested` and
 * `current` and no dates has no time axis, and dividing by a zero-year span is
 * exactly the unguarded division §2.1.7 forbids. Phase 6 computes the return
 * from these; Phase 3 only has to record them.
 */
export const Cashflow = z.object({
  date: IsoDate,
  amount: Money,
})
export type Cashflow = z.infer<typeof Cashflow>

export const Investment = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: InvestmentKind,
  units: z.number().finite().nonnegative(),
  /** Latest NAV or price per unit. */
  price: NonNegativeMoney,
  invested: NonNegativeMoney,
  current: NonNegativeMoney,
  /** Annual expense ratio as a percentage, where the product discloses one. */
  expenseRatio: z.number().finite().min(0).max(10).nullable(),
  /** True when a standing instruction adds to this holding every month. */
  sip: z.boolean(),
  cashflows: z.array(Cashflow),
})
export type Investment = z.infer<typeof Investment>
