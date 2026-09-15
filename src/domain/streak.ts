/**
 * Consecutive-day streak from a set of check-in dates.
 *
 * §11 Phase 7's gate is literally "streak works across a date change", so this
 * is pure and takes `today` as an argument rather than reading the clock: a
 * streak that only works when the machine happens to be in the right timezone on
 * the right side of midnight is not testable, and is wrong for half of India's
 * evening anyway.
 */

const DAY_MS = 86_400_000

function toUtcDay(iso: string): number | null {
  const parsed = Date.parse(`${iso}T00:00:00Z`)
  return Number.isFinite(parsed) ? Math.floor(parsed / DAY_MS) : null
}

export function currentStreak(dates: readonly string[], today: string): number {
  const todayDay = toUtcDay(today)
  if (todayDay === null) return 0

  const days = new Set<number>()
  for (const date of dates) {
    const day = toUtcDay(date)
    if (day !== null) days.add(day)
  }
  if (days.size === 0) return 0

  /*
   * A streak survives today not being checked in yet — it breaks only once
   * yesterday is missed. Counting from today would reset every single morning.
   */
  let cursor = days.has(todayDay) ? todayDay : todayDay - 1
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}
