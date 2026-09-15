/**
 * §4.5 — the single rupee path. Every amount rendered anywhere in the app goes
 * through this file, and §12 greps the codebase for `₹` and `toLocaleString`:
 * the only hits may be here.
 *
 * The rule that makes this file subtle is **round first, then pick the unit**.
 * Bucketing on the raw value and rounding afterwards renders ₹99,97,000 as
 * "₹100 L" (sub-crore bucket → 99.97 → 100.0 → `.0` dropped) and never promotes
 * ₹999.96 to ₹1,000. Both are §12 test cases.
 */

/** Rendered wherever a value is unknown, null or non-finite (§2.1.7, §8.4). */
export const EM_DASH = '—'

const THOUSAND = 1_000
const LAKH = 100_000
const CRORE = 10_000_000

/** Anything a screen might hand us, including the `null` §8.4 returns for a guarded ratio. */
export type Amount = number | null | undefined

export type AmountTone = 'positive' | 'negative' | 'zero' | 'unknown'

const groupWhole = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Up to one decimal, dropped when `.0` — which `maximumFractionDigits` does for free.
 *
 * §4.5 contradicts itself on the crore band: the prose says "One decimal on L and Cr",
 * but the worked example in the same sentence is `₹1.57 Cr`, which is two. The examples
 * are what §12 tests, so they win — one decimal on lakh (₹10,000 of granularity),
 * two on crore (₹1 lakh of granularity; one decimal would coarsen a net-worth figure
 * to the nearest ₹10 lakh). Flip CRORE_DECIMALS to 1 to take the prose reading instead.
 */
const LAKH_DECIMALS = 1
const CRORE_DECIMALS = 2

const groupLakh = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: LAKH_DECIMALS,
})

const groupCrore = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: CRORE_DECIMALS,
})

/**
 * Narrows to a number that can actually be rendered. `NaN` and `Infinity` are
 * both excluded — §2.1.7 forbids either reaching the screen.
 */
export function isRenderableAmount(value: Amount): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Half-up rounding at a fixed decimal place, for non-negative values only
 * (callers take the absolute value first and re-apply the sign).
 *
 * `Math.round` alone is not enough: 99.95 is held as 99.9499999999999957…, so a
 * naive round returns 99.9 where Indian convention wants 100.0. The 1e-9 epsilon
 * absorbs that representation error without affecting any real rupee figure.
 */
function roundHalfUp(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits
  const scaled = value * factor
  const whole = Math.floor(scaled)
  const remainder = scaled - whole
  return (remainder >= 0.5 - 1e-9 ? whole + 1 : whole) / factor
}

/**
 * The compact body, without sign or symbol. Takes a non-negative value.
 *
 * Each band rounds to its own precision and then re-checks the boundary, so a
 * value that rounds *up* into the next unit is promoted rather than rendered as
 * "100 L" or "999.96".
 */
function compactBody(abs: number): string {
  if (abs < LAKH) {
    const rupees = roundHalfUp(abs, 0)
    // 99,999.6 rounds to 1,00,000 — promote rather than print "₹1,00,000" compactly.
    return rupees < LAKH ? groupWhole.format(rupees) : compactBody(rupees)
  }

  if (abs < CRORE) {
    const lakhs = roundHalfUp(abs / LAKH, LAKH_DECIMALS)
    if (lakhs < 100) {
      return `${groupLakh.format(lakhs)} L`
    }
    // 99,97,000 → 100.0 L → promote to crore. Falls through deliberately.
  }

  return `${groupCrore.format(roundHalfUp(abs / CRORE, CRORE_DECIMALS))} Cr`
}

/**
 * Compact Indian currency: `₹850` · `₹15,400` · `₹15.7 L` · `₹1.57 Cr`.
 * Negatives render with the sign outside the symbol: `-₹15.7 L`.
 */
export function formatCompact(value: Amount): string {
  if (!isRenderableAmount(value)) return EM_DASH
  const sign = value < 0 ? '-' : ''
  return `${sign}₹${compactBody(Math.abs(value))}`
}

/**
 * Full Indian grouping to the rupee: `₹15,70,000`. Use wherever a figure is
 * reconciled against a statement, and for every editable amount field.
 */
export function formatFull(value: Amount): string {
  if (!isRenderableAmount(value)) return EM_DASH
  const sign = value < 0 ? '-' : ''
  return `${sign}₹${groupWhole.format(roundHalfUp(Math.abs(value), 0))}`
}

/**
 * The exact figure, for a `title` or `aria-label` on a compacted number, so the
 * precise amount stays reachable when the visible text says "₹15.7 L".
 */
export function formatExact(value: Amount): string {
  return formatFull(value)
}

/** §4.2 — hero figures are coloured by sign; `unknown` renders the em dash. */
export function amountTone(value: Amount): AmountTone {
  if (!isRenderableAmount(value)) return 'unknown'
  if (value < 0) return 'negative'
  if (value > 0) return 'positive'
  return 'zero'
}

/**
 * Takes a ratio (0.29), not a percentage (29) — §8.4's guarded metrics all
 * return ratios, and `null` when the denominator was zero.
 */
export function formatPercent(value: Amount, fractionDigits = 0): string {
  if (!isRenderableAmount(value)) return EM_DASH
  const percent = roundHalfUp(Math.abs(value) * 100, fractionDigits)
  const sign = value < 0 ? '-' : ''
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(percent)
  return `${sign}${formatted}%`
}

const SUFFIX_MULTIPLIER: Record<string, number> = {
  k: THOUSAND,
  l: LAKH,
  lakh: LAKH,
  lakhs: LAKH,
  lac: LAKH,
  lacs: LAKH,
  cr: CRORE,
  crore: CRORE,
  crores: CRORE,
}

const AMOUNT_PATTERN = /^(-?)(\d+(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|crores?|cr)?$/i

/**
 * Parses what a person actually types: `15k`, `1.5L`, `2 Cr`, `₹15000`, `15,000`.
 *
 * Returns `null` — never `0` — for anything it cannot read. A silent zero in a
 * finance app is worse than a rejected input: it writes a real transaction of
 * the wrong amount. §9.2's confirm sheet is what turns a `null` into a prompt.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹,]/g, '').trim()
  if (cleaned === '') return null

  const match = AMOUNT_PATTERN.exec(cleaned)
  if (match === null) return null

  const [, sign, digits, suffix] = match
  if (digits === undefined) return null

  const magnitude = Number.parseFloat(digits)
  if (!Number.isFinite(magnitude)) return null

  const multiplier = suffix === undefined ? 1 : SUFFIX_MULTIPLIER[suffix.toLowerCase()]
  if (multiplier === undefined) return null

  const amount = magnitude * multiplier
  if (!Number.isFinite(amount)) return null

  return sign === '-' ? -amount : amount
}
