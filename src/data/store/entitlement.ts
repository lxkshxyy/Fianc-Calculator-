import { moduleTier } from '@/domain/journey'
import { useProfile } from './data'

/**
 * §9.5 — the one place tier gating is decided.
 *
 * Scattering `tier === 'diamond'` through components is how a paywall ends up
 * enforced on five screens and forgotten on the sixth. Everything asks here.
 */
export type Entitlement = {
  allowed: boolean
  required: 'silver' | 'diamond'
  current: 'silver' | 'diamond'
}

export function useEntitlement(moduleId: string): Entitlement {
  const current = useProfile()?.tier ?? 'silver'
  const required = moduleTier(moduleId)
  return {
    allowed: required === 'silver' || current === 'diamond',
    required,
    current,
  }
}
