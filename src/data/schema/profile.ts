import { z } from 'zod'

import { baseFields, IsoDate } from './common'

/**
 * The single record that owns who the user is inside the product.
 *
 * `tier` and `displayName` live here rather than on the session slice: §8.1
 * allows `persist` only on prefs/UI, and two sources of truth for tier is
 * exactly the drift the layering rule exists to prevent.
 *
 * `stageId` is derived from completed stage tasks (§7), never assigned by hand
 * and never inferred from net worth.
 */
export const Tier = z.enum(['silver', 'diamond'])
export type Tier = z.infer<typeof Tier>

export const Language = z.enum(['en', 'hi'])
export type Language = z.infer<typeof Language>

export const Profile = z.object({
  ...baseFields,
  displayName: z.string().min(1),
  tier: Tier,
  stageId: z.string().min(1),
  language: Language,
  /** Consecutive days with a Morning Club check-in. Derived from CheckIn records. */
  streakCount: z.number().int().nonnegative(),
  lastCheckInDate: IsoDate.nullable(),
  /** Dashboard section order and visibility, set by Edit Dashboard (§9.1). */
  dashboardLayout: z.array(z.string()).nullable(),
  hiddenDashboardSections: z.array(z.string()),
})
export type Profile = z.infer<typeof Profile>
