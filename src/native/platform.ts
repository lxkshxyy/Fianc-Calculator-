import { Capacitor } from '@capacitor/core'

/**
 * True when this bundle is running inside the Android (or iOS) shell rather than
 * a browser tab.
 *
 * Every native-only branch in the app goes through this one function. The
 * plugins themselves are loaded with dynamic `import()` behind it, so a browser
 * build never downloads or evaluates native plugin code, and the test
 * environment — where `isNativePlatform()` is false — never touches it either.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** The host platform, for the rare place that needs to tell Android from iOS. */
export function nativePlatform(): string {
  return Capacitor.getPlatform()
}

/** Dark and light base surfaces, mirrored from `--bg` in tokens.css. */
const BACKGROUND = { dark: '#0a0b0c', light: '#f6f7f8' } as const

/**
 * The theme actually in force right now.
 *
 * §4.1 gives the app three states, and `system` stamps no attribute at all — so
 * reading `data-theme` alone would report the wrong answer for most users. The
 * media query is the fallback, exactly as CSS resolves it.
 */
export function resolvedTheme(): 'dark' | 'light' {
  const stamped = document.documentElement.getAttribute('data-theme')
  if (stamped === 'dark' || stamped === 'light') return stamped
  if (typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function themeBackground(theme: 'dark' | 'light'): string {
  return BACKGROUND[theme]
}
