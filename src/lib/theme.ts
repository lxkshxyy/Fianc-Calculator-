import { useCallback, useEffect, useState } from 'react'

/**
 * Three states, not two (§4.1). `system` is the default and stamps nothing on
 * <html>, leaving prefers-color-scheme to decide — which is why every token has
 * a value on bare :root.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

const STORAGE_KEY = 'wrc.theme'

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * Reads the stored preference. Storage can throw outright in a private window or
 * with site data blocked, so every read is guarded — §2.1.6's "never throw on boot".
 */
export function readStoredTheme(): ThemePreference {
  try {
    const stored: unknown = window.localStorage.getItem(STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Stamps <html>. `system` removes the attribute so the media query takes over. */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
}

export function useTheme(): {
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredTheme)

  useEffect(() => {
    applyTheme(preference)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* A rejected write is not worth failing a theme toggle over. */
    }
  }, [])

  return { preference, setPreference }
}

/** True when the user has asked the OS to reduce motion (§4.6). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent): void => {
      setReduced(event.matches)
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  }, [])

  return reduced
}
