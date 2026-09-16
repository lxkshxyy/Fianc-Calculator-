import { PREVIEW_ALL } from '@/config/preview'
import { moduleTier } from '@/domain/journey'
import { useProfile } from './data'

/**
 * §9.5 — the one place tier gating is decided.
 *
 * Scattering `tier === 'diamond'` through components is how a paywall ends up
 * enforced on five screens and forgotten on the sixth. Everything asks here.
 */
export type Entitlement = {
  /** Whether the screen opens right now. Always true while previewing. */
  allowed: boolean
  /**
   * Whether this user has actually paid for it. This is the real answer and it
   * is never affected by preview mode — it is what the app knows about its own
   * paywall, and what restores when PREVIEW_ALL goes back to false.
   */
  earned: boolean
  /** True when the screen is open only because preview mode is on. */
  previewing: boolean
  required: 'silver' | 'diamond'
  current: 'silver' | 'diamond'
}

export function useEntitlement(moduleId: string): Entitlement {
  const current = useProfile()?.tier ?? 'silver'
  const required = moduleTier(moduleId)
  const earned = required === 'silver' || current === 'diamond'

  return {
    allowed: PREVIEW_ALL ? true : earned,
    earned,
    previewing: PREVIEW_ALL && !earned,
    required,
    current,
  }
}
