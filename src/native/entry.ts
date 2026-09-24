import { isNativeApp, stampShell } from './platform'

/**
 * Where the Android app opens.
 *
 * Capacitor hosts `dist/` and loads its root, so without this the launcher icon
 * would open the public marketing landing page — correct for a website, wrong
 * for something in the app drawer. The PWA never had this problem: its manifest
 * set `start_url` to the dashboard. This is that same line, for the native shell.
 *
 * Sending it to the dashboard rather than straight to `/auth` keeps the existing
 * §6 guard in charge — signed out, RequireAuth redirects to `/auth` and carries
 * `redirectTo`, so the first thing after sign-in is the dashboard, not the
 * landing page again.
 *
 * THE SIDE EFFECT AND THE IMPORT ORDER ARE BOTH DELIBERATE. `createBrowserRouter`
 * reads `window.location` when the router module is evaluated, which happens as
 * `./App` is imported. This module is imported before it in main.tsx, so the URL
 * is already correct by the time the router is built. Move the import and the
 * app opens on the landing page again.
 */
if (isNativeApp() && window.location.pathname === '/') {
  window.history.replaceState(null, '', '/app/dashboard')
}

/*
 * Stamped here rather than in main.tsx for the same reason as the line above:
 * this module runs before the first render, so the first paint already has the
 * right attribute and no header is drawn at the browser size and then resized.
 */
stampShell()
