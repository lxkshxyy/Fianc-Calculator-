#!/usr/bin/env node
/**
 * qa.mjs — the §12 checklist, as far as it can be checked without a browser.
 *
 *   node qa.mjs
 *
 * These are the checks that catch silent regressions: a rupee string rendered
 * outside money.ts, a `100vh` that cuts content off on a phone, a `: any` that
 * slipped past review. The ones it cannot do — a real 360×640 device, keyboard
 * traversal, the install prompt — are listed at the end as a manual pass.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else acc.push(relative(ROOT, full).split(sep).join('/'))
  }
  return acc
}

const FILES = walk(join(ROOT, 'src'))
const CODE = FILES.filter((f) => /\.(ts|tsx|css)$/.test(f))
const PRODUCT = CODE.filter((f) => !/\.(test|spec)\./.test(f))

function read(path) {
  try {
    return readFileSync(join(ROOT, path), 'utf8')
  } catch {
    return ''
  }
}

/**
 * Lines with their comments stripped — the only text that actually ships.
 *
 * Trailing comments matter as much as leading ones here: `min-height: 100dvh;
 * /* never 100vh *\/` is correct code, and a checker that flags it teaches
 * people to ignore the checker.
 */
function codeLines(path) {
  const out = []
  let inBlock = false

  read(path)
    .split('\n')
    .forEach((raw, index) => {
      let line = raw

      if (inBlock) {
        const close = line.indexOf('*/')
        if (close === -1) return
        line = line.slice(close + 2)
        inBlock = false
      }

      // Strip complete block comments, then an unterminated one, then a line comment.
      line = line.replace(/\/\*[\s\S]*?\*\//g, ' ')
      const open = line.indexOf('/*')
      if (open !== -1) {
        line = line.slice(0, open)
        inBlock = true
      }
      const lineComment = line.indexOf('//')
      if (lineComment !== -1) line = line.slice(0, lineComment)

      if (line.trim() !== '') out.push({ line, number: index + 1 })
    })

  return out
}

const results = []

function check(name, detail, hits) {
  results.push({ name, detail, hits })
}

/* 1 — every rupee figure goes through money.ts (§4.5, §12). Two exemptions:
   money.ts itself, and the quick-add parser, which must strip a symbol the
   user types. Reading a rupee sign is not rendering one. */
check(
  'Rupee symbol only in money.ts',
  'A figure formatted anywhere else drifts from Indian grouping the moment someone edits it.',
  PRODUCT.filter((f) => !f.includes('lib/money') && !f.includes('domain/quickadd')).flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => line.includes('₹'))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

check(
  'No toLocaleString outside money.ts',
  'The default locale groups in thousands, not lakhs.',
  PRODUCT.filter((f) => !f.includes('lib/money')).flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => line.includes('toLocaleString'))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

/* The lookbehind is load-bearing: a bare /h-screen/ also matches inside the
   package name '@capacitor/splash-screen', and a checker that cries wolf is a
   checker people stop reading. Only a real Tailwind class token counts. */
check(
  'No 100vh (§10.2)',
  'Mobile browser chrome changes viewport height; 100vh cuts content off.',
  PRODUCT.flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => /100vh|(?<![\w-])(?:min-)?h-screen\b/.test(line))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

check(
  'No explicit any or @ts-ignore (§2.1.1)',
  'Both are lint errors; this catches one added with the rule disabled inline.',
  PRODUCT.flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => /:\s*any\b|@ts-ignore|@ts-nocheck/.test(line))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

check(
  'No dangerouslySetInnerHTML or reload-as-error-handling (§2.2)',
  '',
  PRODUCT.flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => /dangerouslySetInnerHTML|location\.reload/.test(line))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

check(
  'No process.env in client code (§2.1.9)',
  'Vite does not shim `process`; reading it throws before any fallback runs.',
  PRODUCT.flatMap((f) =>
    codeLines(f)
      .filter(({ line }) => /process\.env/.test(line))
      .map(({ number }) => `${f}:${String(number)}`),
  ),
)

/* Presence checks — these must be found, so an empty result is the failure. */
function mustExist(name, detail, predicate) {
  const found = PRODUCT.some((f) => predicate(read(f)))
  results.push({ name, detail, hits: found ? [] : ['not found anywhere in src/'] })
}

mustExist('Safe-area insets used (§10.3)', '', (body) => body.includes('safe-area-inset'))
mustExist('overscroll-behavior used (§10.4)', '', (body) => body.includes('overscroll'))
mustExist('100dvh used (§10.2)', '', (body) => /100dvh|min-h-dvh/.test(body))
mustExist('inputMode on amount entry (§10.9)', '', (body) => body.includes('inputMode'))

/*
 * Build-aid copy must not reach a customer.
 *
 * The app carried "Preview mode — every paid screen is unlocked", "Reset to
 * demo data", a tier switcher, and two raw spec references (§9.5, §6) rendered
 * as body text. Each was written for whoever was building the app and each was
 * visible to anyone being shown it. This is the check that stops them coming
 * back in the next screen somebody writes.
 */
const BUILD_AID = [
  { pattern: /Preview mode/, why: 'the paywall banner' },
  { pattern: /demo data/i, why: 'a demo-data control' },
  { pattern: /build aid/i, why: 'a build aid described to the user' },
  /* Added after this check passed while the Upgrade screen still told customers
     "No payment provider is wired up in this build". A checker only catches the
     wording it knows; this is the wording it did not. */
  { pattern: /in this build/i, why: 'a note about the build, shown to the user' },
  { pattern: /payment provider/i, why: 'scaffolding around the missing paywall' },
  { pattern: /§\d/, why: 'a spec section number in user-visible text' },
]

check(
  'No build-aid copy in shipped screens',
  'Text written for the developer, rendered to the customer.',
  PRODUCT.filter((f) => f.startsWith('src/') && !f.includes('routes/dev/')).flatMap((f) =>
    codeLines(f)
      /*
       * console.* is not user-visible text. The dev-only scroll guard logs
       * '§10.6 horizontal page scroll…' to the console, which is exactly where a
       * spec number belongs; flagging it would teach people to ignore this check.
       */
      .filter(({ line }) => !/console\.\w+|^\s*'/.test(line.trim()) || !/§/.test(line))
      .filter(({ line }) => BUILD_AID.some(({ pattern }) => pattern.test(line)))
      .map(({ number, line }) => {
        const reason = BUILD_AID.find(({ pattern }) => pattern.test(line))
        return `${f}:${String(number)} — ${reason?.why ?? 'build-aid text'}`
      }),
  ),
)

/*
 * Translation coverage.
 *
 * Not a pass/fail: a partly translated app is a normal state and the English
 * fallback is the design. What is worth knowing is the number, so it is not
 * quietly forgotten at 40%.
 */
{
  const enKeys = [...read('src/i18n/en.ts').matchAll(/^\s{2}'([^']+)':/gm)].map((m) => m[1])
  const hiKeys = new Set([...read('src/i18n/hi.ts').matchAll(/^\s{2}'([^']+)':/gm)].map((m) => m[1]))
  const missing = enKeys.filter((key) => !hiKeys.has(key))
  const pct = enKeys.length === 0 ? 0 : Math.round(((enKeys.length - missing.length) / enKeys.length) * 100)
  console.log('')
  console.log(`  Hindi covers ${String(pct)}% of ${String(enKeys.length)} keys.`)
  if (missing.length > 0) {
    console.log(`  Untranslated (falls back to English): ${missing.slice(0, 6).join(', ')}`)
    if (missing.length > 6) console.log(`  …and ${String(missing.length - 6)} more`)
  }
}

results.push({
  name: 'viewport-fit=cover in index.html (§10.3)',
  detail: 'Without it every safe-area inset resolves to 0px and item 3 silently no-ops.',
  hits: /viewport-fit\s*=\s*cover/.test(read('index.html')) ? [] : ['missing from index.html'],
})

results.push({
  name: 'PWA manifest configured (§11 Phase 10)',
  detail: '',
  hits: /VitePWA/.test(read('vite.config.ts')) ? [] : ['VitePWA not found in vite.config.ts'],
})

/* ---------- report ---------- */

console.log('')
console.log('  §12 quality checks')
console.log('  ' + '─'.repeat(64))

let failures = 0
for (const result of results) {
  const ok = result.hits.length === 0
  if (!ok) failures += 1
  console.log(`  ${ok ? '[pass]' : '[FAIL]'} ${result.name}`)
  if (!ok) {
    if (result.detail) console.log(`         ${result.detail}`)
    for (const hit of result.hits.slice(0, 8)) console.log(`         · ${hit}`)
    if (result.hits.length > 8) {
      console.log(`         · …and ${String(result.hits.length - 8)} more`)
    }
  }
}

console.log('  ' + '─'.repeat(64))
console.log(
  failures === 0
    ? `  All ${String(results.length)} automated checks pass.`
    : `  ${String(failures)} of ${String(results.length)} checks failed.`,
)

/*
 * The paywall reminder.
 *
 * It used to be a banner across the top of the app, which meant the person being
 * shown the build saw it too. This is where it belongs instead: printed on every
 * local run and in every CI build log, in front of the only person who can act
 * on it.
 */
const previewSource = read('src/config/preview.ts')
if (/export const PREVIEW_ALL = true/.test(previewSource)) {
  console.log('')
  console.log('  ' + '!'.repeat(64))
  console.log('  PREVIEW MODE IS ON — every paid screen is unlocked in this build.')
  console.log('  Set PREVIEW_ALL to false in src/config/preview.ts before publishing.')
  console.log('  ' + '!'.repeat(64))
}

console.log('')
console.log('  Still needs a person (§12):')
console.log('   · 360×640, 768×1024 and 1440×900 — no horizontal scroll, nothing behind the tab bar')
console.log('   · A real phone or notched emulator — safe-area insets cannot be checked on desktop')
console.log('   · Tab through the dashboard and open a sheet without touching the mouse')
console.log('   · Settings → Delete my data, then visit every screen')
console.log('   · Settings → switch to Silver (dev build only), confirm gated screens lock rather than blank')
console.log('   · Install to the home screen on Android, then turn off the network')
console.log('')

process.exit(failures === 0 ? 0 : 1)
