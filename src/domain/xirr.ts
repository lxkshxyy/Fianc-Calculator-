/**
 * Annualised return from dated cashflows.
 *
 * §8.2's gap analysis flagged that XIRR was not derivable at all: a holding with
 * only `invested` and `current` has no time axis, and a CAGR over a zero-year
 * span is the unguarded division §2.1.7 forbids. Investment.cashflows carries the
 * dates; this turns them into a rate.
 *
 * Sign convention: negative is money in, positive is money out. The final value
 * of the holding is appended by the caller as a positive flow dated today.
 *
 * Newton–Raphson converges fast but can run away on awkward inputs, so it falls
 * back to bisection over a bracketed range, and returns `null` rather than a
 * wrong number when neither converges.
 */

export type DatedFlow = { date: string; amount: number }

const DAYS_PER_YEAR = 365
const MAX_ITERATIONS = 100
const TOLERANCE = 1e-7

function yearsBetween(from: string, to: string): number {
  const start = Date.parse(from)
  const end = Date.parse(to)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.NaN
  return (end - start) / (1000 * 60 * 60 * 24 * DAYS_PER_YEAR)
}

function presentValue(flows: DatedFlow[], base: string, rate: number): number {
  let total = 0
  for (const flow of flows) {
    const years = yearsBetween(base, flow.date)
    if (!Number.isFinite(years)) return Number.NaN
    total += flow.amount / Math.pow(1 + rate, years)
  }
  return total
}

/**
 * Returns the annualised rate as a ratio (0.12 for 12%), or `null` when it
 * cannot be determined: fewer than two flows, all flows the same sign, a span of
 * zero, an unparseable date, or no convergence.
 */
export function xirr(flows: DatedFlow[]): number | null {
  if (flows.length < 2) return null

  const sorted = [...flows].sort((a, b) => (a.date < b.date ? -1 : 1))
  const base = sorted[0]?.date
  if (base === undefined) return null

  const hasNegative = sorted.some((flow) => flow.amount < 0)
  const hasPositive = sorted.some((flow) => flow.amount > 0)
  if (!hasNegative || !hasPositive) return null

  const span = yearsBetween(base, sorted[sorted.length - 1]?.date ?? base)
  if (!Number.isFinite(span) || span <= 0) return null

  /* Newton–Raphson from a sensible starting guess. */
  let rate = 0.1
  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const value = presentValue(sorted, base, rate)
    if (!Number.isFinite(value)) break
    if (Math.abs(value) < TOLERANCE) return rate

    const step = 1e-6
    const derivative = (presentValue(sorted, base, rate + step) - value) / step
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break

    const next = rate - value / derivative
    if (!Number.isFinite(next) || next <= -0.999999) break
    if (Math.abs(next - rate) < TOLERANCE) return next
    rate = next
  }

  /* Bisection over a wide bracket, for the cases Newton walked away from. */
  let low = -0.9999
  let high = 10
  let lowValue = presentValue(sorted, base, low)
  const highValue = presentValue(sorted, base, high)
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return null
  /* No sign change across the bracket means no root inside it. */
  if (lowValue * highValue > 0) return null

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const mid = (low + high) / 2
    const midValue = presentValue(sorted, base, mid)
    if (!Number.isFinite(midValue)) return null
    if (Math.abs(midValue) < TOLERANCE) return mid
    if (lowValue * midValue < 0) {
      high = mid
    } else {
      low = mid
      lowValue = midValue
    }
  }
  return null
}
