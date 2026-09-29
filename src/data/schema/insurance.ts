import { z } from 'zod'

import { baseFields, IsoDate, NonNegativeMoney, sourceFields } from './common'

export const PolicyKind = z.enum([
  'term',
  'health',
  'family-floater',
  'critical-illness',
  'accident',
  'other',
])
export type PolicyKind = z.infer<typeof PolicyKind>

export const InsurancePolicy = z.object({
  ...baseFields,
  ...sourceFields,
  name: z.string().min(1),
  kind: PolicyKind,
  insurer: z.string().min(1),
  /** Sum assured. */
  cover: NonNegativeMoney,
  annualPremium: NonNegativeMoney,
  renewsOn: IsoDate,
})
export type InsurancePolicy = z.infer<typeof InsurancePolicy>
