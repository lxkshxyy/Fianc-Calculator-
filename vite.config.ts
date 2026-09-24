import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { qrcode } from 'vite-plugin-qrcode'
import { defineConfig } from 'vitest/config'

/*
 * The on-device document reader (src/lib/scan/ocr.ts) needs three files beside
 * the app: Tesseract's worker, its WebAssembly engine and the English model.
 * They are copied straight out of node_modules — into the build as /ocr/*, and
 * served from the same path by the dev server — so they can never drift from
 * the tesseract.js version in package.json, and nothing binary is committed.
 *
 * Two engine builds ship: SIMD for any recent WebView, and the plain one as the
 * fallback for an old phone. The larger non-LSTM builds are not needed — the app
 * only ever runs the LSTM recogniser.
 */
const OCR_FILES: Record<string, string> = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
}

function ocrSource(file: string): string {
  const target = OCR_FILES[file]
  if (target === undefined) throw new Error(`Unknown OCR asset ${file}`)
  for (const root of ['./node_modules/', './node_modules/tesseract.js/node_modules/']) {
    const candidate = fileURLToPath(new URL(root + target, import.meta.url))
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`OCR asset missing: ${target}. Run npm install.`)
}

function ocrAssets(): Plugin {
  return {
    name: 'wrc-ocr-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const match = /^\/ocr\/([\w.-]+)$/.exec((request.url ?? '').split('?')[0] ?? '')
        const file = match?.[1]
        if (file === undefined || OCR_FILES[file] === undefined) {
          next()
          return
        }
        response.setHeader(
          'Content-Type',
          file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream',
        )
        createReadStream(ocrSource(file)).pipe(response)
      })
    },
    generateBundle() {
      for (const file of Object.keys(OCR_FILES)) {
        this.emitFile({
          type: 'asset',
          fileName: `ocr/${file}`,
          source: readFileSync(ocrSource(file)),
        })
      }
    },
  }
}

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

/*
 * The QR codes are for a phone, and they are about fifty lines tall between
 * them — on `npm run dev` they push Vite's own banner, and with it the
 * `Local: http://localhost:5173/` line, clean off the top of the terminal. That
 * makes the dev server look like it failed to start when it is running fine.
 * So they print only for the script that is actually about a phone.
 */
const SHOW_QR = process.env['npm_lifecycle_event'] === 'dev:mobile'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ocrAssets(),
    /*
     * Prints a scannable QR of the Network URL in the terminal on `npm run dev`.
     * §10 is a set of claims about how this behaves on a phone, and none of them
     * can be checked in a desktop browser at 360px — a notch, a home indicator
     * and a real thumb are not simulable.
     */
    ...(SHOW_QR ? [qrcode()] : []),
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
        name: 'Wealth Rebuild Circle',
        short_name: 'WRC',
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
        /*
         * The OCR engine and the PDF reader are several megabytes and only
         * needed by someone scanning a document — they load on first use rather
         * than being forced into every install's precache.
         */
        globIgnores: ['ocr/**', '**/pdf.worker*'],
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
