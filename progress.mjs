#!/usr/bin/env node
/**
 * progress.mjs — build progress checker for PROSPERITYPATH_APP_BUILD_SPEC.md
 *
 *   node progress.mjs          file/dep checks only (instant)
 *   node progress.mjs --gates  also runs the four §2.3 gate commands (slow)
 *   node progress.mjs --miss   list every unmet check, not just the current phase
 *
 * Checks are tolerant substring matches against the src/ tree, so renamed files
 * still count as long as the path carries the word. It reports what EXISTS.
 * Only --gates tells you whether any of it actually works.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const ARGS = process.argv.slice(2)
const RUN_GATES = ARGS.includes('--gates')
const SHOW_ALL_MISSING = ARGS.includes('--miss')

/* ---------- helpers ---------- */

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

const FILES = walk(ROOT)
const SRC = FILES.filter((f) => f.startsWith('src/'))
const PKG = existsSync(join(ROOT, 'package.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  : {}
const DEPS = { ...(PKG.dependencies ?? {}), ...(PKG.devDependencies ?? {}) }

const root = (p) => existsSync(join(ROOT, p))
const src = (...words) =>
  SRC.some((f) => words.every((w) => f.toLowerCase().includes(w.toLowerCase())))
const srcCount = (word) =>
  SRC.filter((f) => f.toLowerCase().includes(word.toLowerCase())).length
const dep = (name) => Object.keys(DEPS).some((d) => d === name || d.startsWith(name))
const text = (p, re) => {
  try { return re.test(readFileSync(join(ROOT, p), 'utf8')) } catch { return false }
}
const anySrcText = (re) =>
  SRC.some((f) => { try { return re.test(readFileSync(join(ROOT, f), 'utf8')) } catch { return false } })

/* ---------- the phases, from §11 ---------- */

const PHASES = [
  ['Scaffold', [
    ['package.json',            () => root('package.json')],
    ['tsconfig strict',         () => text('tsconfig.json', /"strict"\s*:\s*true/)],
    ['eslint config',           () => root('eslint.config.js') || root('eslint.config.mjs') || root('.eslintrc.cjs')],
    ['lint + test scripts',     () => !!PKG.scripts?.lint && !!PKG.scripts?.test],
    ['exact pins (.npmrc)',     () => root('.npmrc')],
    ['viewport-fit=cover',      () => text('index.html', /viewport-fit\s*=\s*cover/)],
    ['§8.1 folder layout',      () => src('data/schema') || src('data/repo') || root('src/data')],
  ]],
  ['Design system', [
    ['money.ts',                () => src('money')],
    ['money tests',             () => src('money') && SRC.some((f) => /money.*\.(test|spec)\./i.test(f))],
    ['--text-label token',      () => anySrcText(/--text-label/)],
    ['gold + danger tokens',    () => anySrcText(/--gold/) && anySrcText(/--danger/)],
    ['focus outline rule',      () => anySrcText(/focus-visible/)],
    ['kitchen sink',            () => src('kitchen')],
    ['§4.4 components (8+)',    () => srcCount('components/') >= 8],
  ]],
  ['App shell', [
    ['router',                  () => dep('react-router') && src('rout')],
    ['error boundary',          () => src('error')],
    ['sidebar',                 () => src('sidebar') || src('nav')],
    ['bottom tabs',             () => src('tab')],
    ['app header',              () => src('header')],
    ['404',                     () => src('notfound') || src('not-found') || src('404')],
  ]],
  ['Data layer', [
    ['zod schemas (5+)',        () => srcCount('schema') >= 5],
    ['repository',              () => src('repo')],
    ['dexie',                   () => dep('dexie')],
    ['zustand stores',          () => dep('zustand') && src('store')],
    ['seed data',               () => src('seed')],
    ['reset controls',          () => anySrcText(/clear everything|resetToDemo|reset_demo/i)],
  ]],
  ['Dashboard', [
    ['dashboard route',         () => src('dashboard')],
    ['net worth card',          () => src('networth') || src('net-worth')],
    ['stage card / rail',       () => src('stage')],
    ['metric tiles',            () => src('metric')],
    ['progress ring',           () => src('ring') || src('progress')],
    ['quick-add parser',        () => src('parse') || src('quickadd') || src('quick-add')],
  ]],
  ['Money modules', [
    ['income',                  () => src('income')],
    ['income opportunities',    () => src('opportunit')],
    ['budget',                  () => src('budget')],
    ['emi & credit',            () => src('emi') || src('credit')],
    ['tax',                     () => src('tax')],
    ['dated tax config',        () => anySrcText(/assessmentYear|assessment_year|ratesAsOf/i)],
  ]],
  ['Wealth modules', [
    ['investments',             () => src('investment')],
    ['goals',                   () => src('goal')],
    ['assets',                  () => src('asset')],
    ['insurance',               () => src('insurance')],
    ['charts',                  () => dep('recharts')],
  ]],
  ['Growth modules', [
    ['learning',                () => src('learn')],
    ['morning club',            () => src('morning')],
    ['achievements',            () => src('achievement') || src('badge')],
    ['referrals',               () => src('referral') || src('refer')],
  ]],
  ['Tools', [
    ['ai assistant',            () => src('assistant')],
    ['documents',               () => src('document')],
    ['expert chat',             () => src('chat')],
    ['family',                  () => src('family')],
    ['settings',                () => src('setting')],
    ['tier gating hook',        () => anySrcText(/useEntitlement/)],
  ]],
  ['Public site', [
    ['landing',                 () => src('landing') || src('home')],
    ['feature catalogue',       () => src('feature')],
    ['request centre',          () => src('request')],
    ['auth',                    () => src('auth')],
    ['legal pages',             () => src('legal') || src('privacy')],
    ['consent on step 1',       () => anySrcText(/consent/i)],
  ]],
  ['PWA + mobile', [
    ['vite-plugin-pwa',         () => dep('vite-plugin-pwa')],
    /* vite-plugin-pwa generates the manifest at build time from vite.config.ts,
       so there is no manifest file in source to look for. */
    ['manifest',                () => /manifest\s*:/.test(readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').toString()) || FILES.some((f) => /manifest\.(webmanifest|json)$/.test(f))],
    ['icons',                   () => FILES.some((f) => /icon.*\.(png|svg)$/i.test(f))],
    ['100dvh',                  () => anySrcText(/100dvh/)],
    ['safe-area insets',        () => anySrcText(/safe-area-inset/)],
    ['overscroll contain',      () => anySrcText(/overscroll/)],
  ]],
  ['QA pass', [
    ['money tests',             () => SRC.some((f) => /money.*\.(test|spec)\./i.test(f))],
    ['parser tests',            () => SRC.some((f) => /(pars|quick).*\.(test|spec)\./i.test(f))],
    /* Rendered figures only. money.ts owns formatting; the quick-add parser has
       to strip a symbol the user types; tests feed one in on purpose. Comments
       are stripped so a line documenting the rule does not trip it. */
    ['no stray ₹ outside money',() => !SRC.some((f) => {
      if (/money|quickadd/i.test(f) || /\.(test|spec)\./.test(f)) return false
      if (!/\.(ts|tsx)$/.test(f)) return false
      try {
        return readFileSync(join(ROOT, f), 'utf8')
          .split('\n')
          .map((l) => l.replace(/\/\*[\s\S]*?\*\//g, ' '))
          .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
          .some((l) => l.includes('\u20B9'))
      } catch { return false }
    })],
  ]],
]

/* ---------- report ---------- */

const bar = (d, t, w = 14) => {
  const n = t === 0 ? 0 : Math.round((d / t) * w)
  return '█'.repeat(n) + '░'.repeat(w - n)
}
const pad = (s, n) => String(s).padEnd(n)

console.log('')
console.log('  ProsperityPath — build progress')
console.log('  ' + ROOT)
console.log('  ' + '─'.repeat(62))

let totalDone = 0
let totalAll = 0
let current = null

PHASES.forEach(([name, checks], i) => {
  const results = checks.map(([label, fn]) => {
    let ok = false
    try { ok = !!fn() } catch { ok = false }
    return [label, ok]
  })
  const done = results.filter(([, ok]) => ok).length
  totalDone += done
  totalAll += checks.length

  const icon = done === checks.length ? '[done]' : done === 0 ? '[    ]' : '[ >> ]'
  if (!current && done < checks.length) current = [i, name, results]

  console.log(
    `  ${icon} Phase ${pad(i, 2)} ${pad(name, 16)} ${pad(`${done}/${checks.length}`, 6)} ${bar(done, checks.length)}`
  )

  if (SHOW_ALL_MISSING) {
    results.filter(([, ok]) => !ok).forEach(([label]) => console.log(`             · ${label}`))
  }
})

const pct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100)
console.log('  ' + '─'.repeat(62))
console.log(`  Overall  ${pct}%   (${totalDone} of ${totalAll} checks)`)

if (current) {
  const [i, name, results] = current
  console.log(`  Next     Phase ${i} — ${name}`)
  if (!SHOW_ALL_MISSING) {
    const missing = results.filter(([, ok]) => !ok).map(([l]) => l)
    if (missing.length) console.log(`  Missing  ${missing.join(', ')}`)
  }
} else {
  console.log('  All phase markers present. Run with --gates to confirm it builds.')
}

/* ---------- gates ---------- */

if (RUN_GATES) {
  console.log('')
  console.log('  §2.3 gate')
  console.log('  ' + '─'.repeat(62))
  const gates = [
    ['tsc',   'npx tsc --noEmit'],
    ['lint',  'npm run lint'],
    ['test',  'npm test'],
    ['build', 'npm run build'],
  ]
  let allGreen = true
  for (const [label, cmd] of gates) {
    const r = spawnSync(cmd, { shell: true, stdio: 'pipe', cwd: ROOT })
    const ok = r.status === 0
    if (!ok) allGreen = false
    console.log(`  ${ok ? '[pass]' : '[FAIL]'} ${pad(label, 6)} ${cmd}`)
    if (!ok) {
      const out = (r.stderr?.toString() || r.stdout?.toString() || '').trim().split('\n').slice(0, 12)
      out.forEach((l) => console.log(`         ${l}`))
    }
  }
  console.log('  ' + '─'.repeat(62))
  console.log(allGreen ? '  Gate green — this phase may be closed.' : '  Gate red — do not start the next phase.')
}

console.log('')
console.log('  File checks show what EXISTS, not what works. Only --gates proves that.')
console.log('')
