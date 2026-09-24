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

/**
 * The picture on the profile: one of the preset avatars, or a photo the person
 * chose from their gallery.
 *
 * A preset is stored by id (`preset:<id>`) rather than as its artwork, so the
 * drawings can be refined later and every profile using one follows. A photo is
 * stored as a small square JPEG data URL — cropped and shrunk on the way in
 * (lib/avatar.ts), so it is a few tens of kilobytes on the one profile record,
 * never the multi-megabyte original.
 */
export const AvatarRef = z.union([
  z.string().regex(/^preset:[a-z0-9-]+$/),
  z.string().startsWith('data:image/'),
])
export type AvatarRef = z.infer<typeof AvatarRef>

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
  /**
   * Null shows the initial-letter circle. Defaulted, like `phone`, so a profile
   * saved before either field existed still parses instead of being reseeded —
   * which would have thrown away the person's name and tier with it.
   */
  avatar: AvatarRef.nullable().default(null),
  /** Contact number, optional. Used to reach them about a Diamond request. */
  phone: z.string().default(''),
})
export type Profile = z.infer<typeof Profile>
