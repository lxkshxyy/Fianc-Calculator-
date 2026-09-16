import { Gem, Shield } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * §9.5 — Silver is the free tier every new signup lands on; Diamond is the only
 * paid one. Gold is spent here deliberately: §4 lists tier badges as one of the
 * five places the accent is allowed.
 */
export type Tier = 'silver' | 'diamond'

export function TierBadge({
  tier,
  size = 'md',
  className,
}: {
  tier: Tier
  size?: 'sm' | 'md'
  className?: string
}) {
  const isDiamond = tier === 'diamond'
  const Icon = isDiamond ? Gem : Shield
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center gap-1.5 border font-medium',
        size === 'sm' ? 'text-micro px-2 py-0.5' : 'text-caption px-2.5 py-1',
        isDiamond
          ? 'border-gold-dim bg-gold/10 text-gold'
          : 'border-border-strong bg-surface-2 text-text-2',
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      {isDiamond ? 'Diamond' : 'Silver'}
    </span>
  )
}
