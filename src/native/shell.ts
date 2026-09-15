import { handleBackPress } from './backButton'
import { isNativeApp, resolvedTheme, themeBackground } from './platform'

/**
 * Brings up the native chrome around the web layer: status bar, splash, back
 * button, keyboard.
 *
 * Every plugin is loaded with a dynamic `import()` *after* the native check, so
 * a browser build never ships this code down the wire and the test environment
 * never evaluates it. Each step is also independently guarded — a plugin missing
 * from a given build is a status bar that keeps its default colour, not an app
 * that fails to start (§2.1.6: nothing on the boot path may throw).
 */

let started = false

async function syncStatusBar(): Promise<void> {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const theme = resolvedTheme()
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: themeBackground(theme) })
    /*
     * The WebView sits below the status bar rather than under it. §10.3's
     * safe-area insets then have nothing to correct for at the top, and the
     * status bar is a solid band of the app's own background — which is what
     * every native Android app looks like.
     */
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {
    /* Status bar styling is cosmetic; never let it take the boot with it. */
  }
}

/**
 * Follows the §4.1 theme without touching theme.ts.
 *
 * `system` stamps no attribute, so watching `data-theme` alone would miss the
 * most common case. Watching both the attribute and the media query covers all
 * three states, and leaves the theme module exactly as it was.
 */
function watchTheme(): void {
  const observer = new MutationObserver(() => {
    void syncStatusBar()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      void syncStatusBar()
    })
  }
}

async function startBackButton(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app')
    await App.addListener('backButton', () => {
      handleBackPress(() => {
        void App.exitApp()
      })
    })
  } catch {
    /* Without this the platform default applies: back closes the app. */
  }
}

async function hideSplash(): Promise<void> {
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* An unhidden splash would be fatal, so this one is worth a console note. */
    console.warn('Native splash screen could not be hidden.')
  }
}

/**
 * Called once from the entry point. Resolves when the native chrome is set up;
 * the caller does not wait for it before rendering, because React must paint
 * before the splash comes down.
 */
export async function startNativeShell(): Promise<void> {
  if (!isNativeApp() || started) return
  started = true

  await syncStatusBar()
  watchTheme()
  await startBackButton()
}

/**
 * Takes the splash down. Called after the first paint, so the user never sees a
 * blank shell between the splash disappearing and the UI arriving.
 */
export function dismissNativeSplash(): void {
  if (!isNativeApp()) return
  requestAnimationFrame(() => {
    void hideSplash()
  })
}
