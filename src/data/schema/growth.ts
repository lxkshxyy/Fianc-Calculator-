import { z } from 'zod'

import { baseFields, IsoDate, NonNegativeMoney } from './common'

/**
 * Records that the §8.2 gap analysis found missing: nothing stored which stage
 * tasks a user had completed, so §9.1's Stage ring had no source, and Phase 7's
 * gate is literally "streak works across a date change" with no CheckIn entity.
 */

/** One completed stage task. `taskId` matches a StageTask id in domain/journey.ts. */
export const StageTaskCompletion = z.object({
  ...baseFields,
  stageId: z.string().min(1),
  taskId: z.string().min(1),
  completedOn: IsoDate,
})
export type StageTaskCompletion = z.infer<typeof StageTaskCompletion>

/** One Morning Club check-in. At most one per calendar day; the date is the key. */
export const CheckIn = z.object({
  ...baseFields,
  date: IsoDate,
  note: z.string(),
})
export type CheckIn = z.infer<typeof CheckIn>

export const LearningModule = z.object({
  ...baseFields,
  title: z.string().min(1),
  /** The stage this module belongs to, matching a Stage id. */
  stageId: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  /** 0..1. */
  progress: z.number().finite().min(0).max(1),
  completed: z.boolean(),
})
export type LearningModule = z.infer<typeof LearningModule>

export const Achievement = z.object({
  ...baseFields,
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  earnedOn: IsoDate.nullable(),
  /** 0..1 towards earning it, for the "progress to next" display. */
  progress: z.number().finite().min(0).max(1),
})
export type Achievement = z.infer<typeof Achievement>

export const ReferralStatus = z.enum(['invited', 'signed-up', 'subscribed'])
export type ReferralStatus = z.infer<typeof ReferralStatus>

export const Referral = z.object({
  ...baseFields,
  name: z.string().min(1),
  status: ReferralStatus,
  invitedOn: IsoDate,
  rewardEarned: NonNegativeMoney,
})
export type Referral = z.infer<typeof Referral>
