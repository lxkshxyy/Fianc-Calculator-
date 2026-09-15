import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Must be imported before './App'. See the file — the order is the feature. */
import '@/native/entry'
import { dismissNativeSplash, isNativeApp, startNativeShell } from '@/native'
import { App } from './App'
import './styles/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

/*
 * Started before the first render and deliberately not awaited: the status bar
 * and back button are native chrome around the UI, not a precondition for it.
 * On the web build this returns immediately without loading a single plugin.
 */
void startNativeShell()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* Only once React has something on screen — a splash that hides on a timer
   either flashes an empty shell or covers an app that is already ready. */
dismissNativeSplash()

/*
 * A service worker is how a *browser* keeps a web app working offline. Inside
 * the Android build every asset already sits on the device in the APK, so a
 * second cache layer buys nothing and can hand back a stale bundle after an app
 * update. Web build only — and only in production, so tests and the dev server
 * never register one.
 */
if (import.meta.env.PROD && !isNativeApp()) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
