import { z } from 'zod'

import { baseFields } from './common'

/** §9.4 — the twelve spend categories the Budget screen tracks. */
export const Category = z.object({
  ...baseFields,
  name: z.string().min(1),
  /** A lucide icon name, resolved at render so the schema stays serialisable. */
  icon: z.string().min(1),
  essential: z.boolean(),
})
export type Category = z.infer<typeof Category>

export const DEFAULT_CATEGORY_NAMES = [
  'Rent',
  'Groceries',
  'Utilities',
  'Transport',
  'Eating Out',
  'Health',
  'Education',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Family Support',
  'Other',
] as const
