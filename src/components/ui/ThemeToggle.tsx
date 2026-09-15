import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'

const ICONS: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

/**
 * §5.1 — "Top: wordmark + theme toggle."
 *
 * Three states, not two: `system` stamps nothing and leaves prefers-color-scheme
 * in charge (§4.1). One implementation, used by the sidebar, the More sheet and
 * the kitchen sink, so the three cannot drift.
 *
 * §10.8 — every segment is a full 44x44, with no smaller variant. `lg:` starts at
 * 1024px, which includes iPad Pro portrait, so the sidebar is a touch surface too
 * and a 32px segment there would be a real miss, not a pedantic one.
 * §2.1.10 — real buttons with `aria-pressed`, keyboard-reachable and announced.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn('inline-flex gap-0.5 rounded-button bg-surface-2 p-0.5', className)}
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option]
        const isActive = preference === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            aria-label={option}
            title={option}
            onClick={() => {
              setPreference(option)
            }}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150',
              isActive ? 'bg-surface text-gold' : 'text-text-2 hover:text-text',
            )}
          >
            <Icon aria-hidden className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
