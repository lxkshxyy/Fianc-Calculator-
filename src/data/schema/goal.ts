import { z } from 'zod'

import { baseFields, IsoDate, NonNegativeMoney } from './common'

export const Goal = z.object({
  ...baseFields,
  name: z.string().min(1),
  target: NonNegativeMoney,
  saved: NonNegativeMoney,
  targetDate: IsoDate,
  /** Milestone fractions of the target, e.g. [0.25, 0.5, 0.75, 1]. */
  milestones: z.array(z.number().finite().min(0).max(1)),
  active: z.boolean(),
})
export type Goal = z.infer<typeof Goal>
