import { z } from 'zod'

import { baseFields, IsoDate, Money } from './common'

export const TransactionKind = z.enum(['income', 'expense', 'investment', 'transfer'])
export type TransactionKind = z.infer<typeof TransactionKind>

/**
 * A single ledger line. Amounts are always positive; direction lives in `kind`,
 * so a sign error cannot silently turn spending into earnings.
 */
export const Transaction = z.object({
  ...baseFields,
  date: IsoDate,
  kind: TransactionKind,
  amount: Money.nonnegative(),
  categoryId: z.string().nullable(),
  note: z.string(),
  /** True when this line was created by the §9.2 quick-add parser. */
  fromQuickAdd: z.boolean(),
  recurring: z.boolean(),
})
export type Transaction = z.infer<typeof Transaction>
