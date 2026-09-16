import { z } from 'zod'

/**
 * §8.2 — shared primitives. Every entity carries `id`, `createdAt`, `updatedAt`
 * and exports its Zod schema alongside its type.
 */

export const Id = z.string().min(1)

/** A calendar date, YYYY-MM-DD. Used wherever the time of day is meaningless. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.')

/** Epoch milliseconds. Used for record timestamps. */
export const Timestamp = z.number().int().nonnegative()

/** A rupee amount. Finite by construction — §2.1.7 forbids NaN or Infinity reaching a screen. */
export const Money = z.number().finite()
export const NonNegativeMoney = z.number().finite().nonnegative()

/** A proportion in 0..1. Percentages are stored as ratios and formatted at render. */
export const Ratio = z.number().finite().min(0).max(1)

/** An annual interest rate as a percentage, e.g. 8.65 for 8.65% p.a. */
export const RatePercent = z.number().finite().min(0).max(100)

export const baseFields = {
  id: Id,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

export function newId(prefix: string): string {
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}_${random.replace(/-/g, '').slice(0, 12)}`
}

export function nowMs(): number {
  return Date.now()
}

/** Today as YYYY-MM-DD in the user's own timezone, not UTC. */
export function todayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** The YYYY-MM month key a date belongs to, for monthly rollups. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}
