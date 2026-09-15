import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { qrcode } from 'vite-plugin-qrcode'
import { defineConfig } from 'vitest/config'

/*
 * A phone will not install this as an app over plain http on a LAN IP. A service
 * worker only registers in a secure context — https, or localhost — so on a home
 * network the practical route to one is a tunnel. These are the hostnames Vite's
 * host check lets through: suffixes of three known tunnel providers rather than
 * `true`, so the dev server is opened to those and not to anything that resolves
 * to this machine.
 */
const TUNNEL_HOSTS = ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.ngrok.io']

/*
 * npm sets npm_lifecycle_event to the name of the script being run. Through a
 * tunnel the page is served on 443, so hot reload has to be told that; it would
 * otherwise guess the LAN port and fail to connect. Reading the script name
 * keeps that switch out of the command line, which has no portable way to set an
 * environment variable on both Windows and everything else.
 */
const TUNNELLING = process.env['npm_lifecycle_event'] === 'dev:tunnel'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
     * Prints a scannable QR of the Network URL in the terminal on `npm run dev`.
     * §10 is a set of claims about how this behaves on a phone, and none of them
     * can be checked in a desktop browser at 360px — a notch, a home indicator
     * and a real thumb are not simulable.
     */
    qrcode(),
    /*
     * §10 — this is what makes it an app rather than a site: installable, with
     * a home-screen icon, and working with no connection.
     *
     * `autoUpdate` is deliberate. A prompt-to-update flow means a user can sit
     * on a stale shell indefinitely, and §2.1.3 already guarantees there is no
     * server contract to break — every screen reads local data, so a silently
     * refreshed shell cannot desync from a backend that does not exist.
     */
    VitePWA({
      registerType: 'autoUpdate',
      /* main.tsx registers it, so the native build can skip it entirely. */
      injectRegister: null,
      includeAssets: ['favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'ProsperityPath',
        short_name: 'Prosperity',
        description: 'A step-by-step path to knowing — and growing — where your money stands.',
        theme_color: '#0a0b0c',
        background_color: '#0a0b0c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/app/dashboard',
        scope: '/',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        /* Every route is client-rendered, so a cold deep link offline still
           resolves to the shell rather than the browser's error page. */
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /*
   * Pre-bundle the native plugins at server start instead of letting Vite
   * discover them later.
   *
   * Four of these five are only ever reached through a dynamic import inside a
   * native-platform check, so a browser session never actually loads them — but
   * if Vite meets one mid-session it re-runs the optimizer, every
   * `node_modules/.vite/deps/*.js?v=<hash>` URL changes, and a page still
   * holding the old hash fails on the next lazy route it asks for. That surfaces
   * as "Failed to fetch dynamically imported module" on exactly the screens you
   * had not opened yet. Listing them here makes the first start deterministic.
   */
  optimizeDeps: {
    include: [
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/status-bar',
      '@capacitor/splash-screen',
      '@capacitor/keyboard',
    ],
  },
  server: {
    port: 5173,
    /*
     * Bind to every interface so a phone on the same Wi-Fi can reach it.
     * Vite binds to localhost only by default, which is why the dev URL works on
     * this machine and nowhere else.
     */
    host: true,
    allowedHosts: TUNNEL_HOSTS,
    ...(TUNNELLING ? { hmr: { protocol: 'wss' as const, clientPort: 443 } } : {}),
  },
  /*
   * The production build, served the way a phone actually sees it.
   *
   * `npm run dev` never registers a service worker — devOptions.enabled is false
   * above, on purpose, because a cached shell during development hides the edit
   * you just made. That means the install prompt and offline mode cannot be
   * tested from the dev server at all; they can only be tested from here.
   */
  preview: {
    port: 4173,
    host: true,
    allowedHosts: TUNNEL_HOSTS,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
})
