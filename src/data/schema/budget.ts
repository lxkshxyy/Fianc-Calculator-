import { z } from 'zod'

import { baseFields, NonNegativeMoney } from './common'

/** A monthly spending limit on one category. */
export const Budget = z.object({
  ...baseFields,
  categoryId: z.string().min(1),
  monthlyLimit: NonNegativeMoney,
})
export type Budget = z.infer<typeof Budget>
