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

/**
 * Stamps `data-shell` on `<html>` so a stylesheet can tell the app from a
 * browser tab.
 *
 * The app already hands CSS two facts this way — `data-theme` and
 * `data-density` — and this is the third. A React flag would do for one
 * component, but the difference between the two shells is a matter of how much
 * room there is on screen, which is a styling question: a rule reads better
 * than a ternary, and it can be checked in a browser by setting the attribute
 * by hand rather than by faking a native build.
 *
 * Both values are written, never just the native one. `html[data-shell='web']`
 * is then a real selector rather than the absence of one, and nothing has to
 * reason about an attribute that might not be there yet.
 */
export function stampShell(): void {
  document.documentElement.dataset.shell = isNativeApp() ? 'native' : 'web'
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
