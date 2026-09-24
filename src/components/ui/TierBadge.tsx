import { Gem, Shield } from 'lucide-react'

import { cn } from '@/lib/cn'

/**
 * §9.5 — Silver is the free tier every new signup lands on; Diamond is the only
 * paid one. Gold is spent here deliberately: §4 lists tier badges as one of the
 * five places the accent is allowed.
 *
 * §4.6b — the chip is lit rather than outlined, the same way the meters are: a
 * vertical gradient so it reads as a curved surface, a bright edge along the top
 * and a dark one along the bottom, a shadow cast on whatever is behind it, and a
 * sheen that crosses the face every few seconds. All of it lives in `.tier-chip`
 * in index.css, because it is lighting rather than layout and because the
 * reduced-motion block there already switches the sheen off for anyone who has
 * asked for less movement.
 */
export type Tier = 'silver' | 'diamond'

export function TierBadge({
  tier,
  size = 'md',
  iconOnly = false,
  className,
}: {
  tier: Tier
  size?: 'sm' | 'md'
  /**
   * Just the emblem, no word — a round chip with a heavier-stroked icon.
   *
   * For lists where the badge repeats on row after row (the Wealth and Money
   * indexes): the word "Diamond" four times down one card is noise, while one
   * lit gem per locked row reads at a glance. The name is still there for a
   * screen reader, and as a tooltip on desktop.
   */
  iconOnly?: boolean
  className?: string
}) {
  const isDiamond = tier === 'diamond'
  const Icon = isDiamond ? Gem : Shield
  const name = isDiamond ? 'Diamond' : 'Silver'

  if (iconOnly) {
    return (
      <span
        role="img"
        aria-label={name}
        title={name}
        className={cn(
          'tier-chip rounded-pill inline-flex shrink-0 items-center justify-center',
          isDiamond ? 'tier-diamond' : 'tier-silver',
          size === 'sm' ? 'size-7' : 'size-9',
          className,
        )}
      >
        <Icon
          aria-hidden
          strokeWidth={2.6}
          className={size === 'sm' ? 'size-3.5' : 'size-[1.125rem]'}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'tier-chip rounded-pill inline-flex items-center gap-1.5',
        isDiamond ? 'tier-diamond' : 'tier-silver',
        size === 'sm' ? 'text-micro px-2.5 py-1' : 'text-caption px-3 py-1.5',
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      {name}
    </span>
  )
}
