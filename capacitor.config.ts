import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The native Android shell.
 *
 * Nothing about the app's UI lives here. Capacitor takes the exact `dist/` that
 * `npm run build` already produces and hosts it inside a real Android
 * application — its own package id, its own icon in the launcher, its own entry
 * in the task switcher, and an APK that installs with no browser involved.
 *
 * `androidScheme: 'https'` matters more than it looks. Capacitor can serve the
 * app from `file://`, and on that scheme the WebView is not a secure context:
 * IndexedDB is unavailable or silently partitioned, which would take the whole
 * §8.1 data layer with it. Served from `https://localhost` the storage the app
 * already uses behaves exactly as it does in a browser.
 */
const config: CapacitorConfig = {
  appId: 'ai.prosperitypath.app',
  appName: 'ProsperityPath',
  webDir: 'dist',
  android: {
    /* Painted behind the WebView, so a slow first frame is the app's own dark
       surface rather than a white flash. */
    backgroundColor: '#0a0b0c',
    /* Release builds only; keeps `adb logcat` useful while debugging. */
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      /* Hidden from JS once React has actually painted, not on a timer — a timer
         either flashes an empty shell or holds a splash over a ready app. */
      launchAutoHide: false,
      backgroundColor: '#0a0b0c',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Keyboard: {
      /* `native` lets Android resize the window itself, which keeps the quick-add
         bar above the keyboard without any JS measuring viewport height. */
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
}

export default config
