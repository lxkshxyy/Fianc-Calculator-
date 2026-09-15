import { z } from 'zod'

import { baseFields, NonNegativeMoney } from './common'

export const AssetKind = z.enum([
  'cash',
  'bank',
  'fixed-deposit',
  'gold',
  'property',
  'vehicle',
  'epf',
  'other',
])
export type AssetKind = z.infer<typeof AssetKind>

/**
 * Which kinds count towards the emergency fund. §8.4 needs this: an emergency
 * fund measured in months of spending is meaningless if a flat counts towards it.
 */
export const LIQUID_ASSET_KINDS: ReadonlySet<AssetKind> = new Set<AssetKind>([
  'cash',
  'bank',
  'fixed-deposit',
])

export const Asset = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: AssetKind,
  value: NonNegativeMoney,
  /** Recorded so Legacy-stage nominee coverage can be checked (§7). */
  nominee: z.string().nullable(),
})
export type Asset = z.infer<typeof Asset>

export function isLiquid(asset: Asset): boolean {
  return LIQUID_ASSET_KINDS.has(asset.kind)
}
