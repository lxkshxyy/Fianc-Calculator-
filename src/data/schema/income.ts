import { z } from 'zod'

import { baseFields, NonNegativeMoney } from './common'

export const IncomeKind = z.enum(['salary', 'freelance', 'business', 'rental', 'interest', 'other'])
export type IncomeKind = z.infer<typeof IncomeKind>

export const IncomeCadence = z.enum(['monthly', 'quarterly', 'annual', 'irregular'])
export type IncomeCadence = z.infer<typeof IncomeCadence>

export const IncomeSource = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: IncomeKind,
  /** Gross amount per occurrence of `cadence`. */
  amount: NonNegativeMoney,
  cadence: IncomeCadence,
  active: z.boolean(),
})
export type IncomeSource = z.infer<typeof IncomeSource>

const MONTHS_PER: Record<IncomeCadence, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  irregular: 12,
}

/** Normalises any cadence to a monthly figure, so totals are comparable. */
export function monthlyValue(source: IncomeSource): number {
  if (!source.active) return 0
  return source.amount / MONTHS_PER[source.cadence]
}
