import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'

const ICONS: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const NEXT_LABEL: Record<ThemePreference, string> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

/**
 * §5.1 — one button, not three.
 *
 * It used to be a segmented control of three 44px buttons, which took a whole
 * row of a 260px sidebar to expose a setting people touch once. Now it shows
 * the theme you are on and cycles light → dark → system on click.
 *
 * Nothing about the three states changed: `system` still stamps nothing and
 * leaves prefers-color-scheme in charge (§4.1). This is one implementation used
 * by the sidebar, the More sheet and the public header, so they cannot drift.
 *
 * §10.8 — still a full 44x44 touch target; `lg:` starts at 1024px, which takes
 * in iPad Pro portrait, so the sidebar is a touch surface too.
 * §2.1.10 — a real button, keyboard-reachable, and the label says what pressing
 * it will do rather than only what is currently on.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const Icon = ICONS[preference]

  const next =
    THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(preference) + 1) % THEME_PREFERENCES.length] ??
    'light'

  return (
    <button
      type="button"
      aria-label={`Theme: ${preference}. Switch to ${NEXT_LABEL[preference]}.`}
      title={`Theme: ${preference} — click for ${NEXT_LABEL[preference]}`}
      onClick={() => {
        setPreference(next)
      }}
      className={cn(
        'rounded-button inline-flex size-11 shrink-0 items-center justify-center',
        'bg-surface-2 text-text-2 transition-colors duration-150',
        'hover:text-accent focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}
