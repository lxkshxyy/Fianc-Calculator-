import { useData } from '../store/data'
import { useSession, type Account } from '../store/session'

/**
 * The website's "Explore the demo" — one tap from a visitor to a filled-in app.
 *
 * It is the demo household (seed/demo.ts) with a name and three additions, so
 * the dashboard a visitor opens on is the same one the client presentation
 * walks through: Aarav, a flat under construction, and a school-fund goal
 * beside the two the seed already has.
 *
 * ── Why this is its own account ─────────────────────────────────────────────
 * Everything is stored in the visitor's own browser. A demo written over a real
 * account on that browser would destroy it, so the entry point asks first when
 * a real account is there (DemoEntry), and the demo signs in as an account of
 * its own that the sign-in screen recognises by its email. That account has no
 * password: there is nothing in it but fiction, and a visitor who comes back
 * should be able to walk straight back in.
 */

export const DEMO_EMAIL = 'aarav.demo@example.com'
export const DEMO_NAME = 'Aarav Mehta'

export function isDemoAccount(account: Account | null): boolean {
  return account !== null && account.email.toLowerCase() === DEMO_EMAIL
}

/** The same calendar day, `years` from today, as the YYYY-MM-DD the schema stores. */
function yearsFromToday(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(date.getFullYear())}-${month}-${day}`
}

/**
 * Replaces this browser's data with the showcase household and signs in as it.
 * The caller has already confirmed, if there was anything here to lose.
 */
export async function openShowcase(): Promise<void> {
  const data = useData.getState()

  await data.resetToDemo()
  await data.create('assets', {
    name: 'Flat, Noida (under construction)',
    kind: 'property',
    value: 2_600_000,
    nominee: 'Spouse',
  })
  /* Three years out, so the plan reads ₹15,000 a month for 36 months — the
     figure the presentation quotes. */
  await data.create('goals', {
    name: 'Daughter’s school fund',
    target: 600_000,
    saved: 60_000,
    targetDate: yearsFromToday(3),
    milestones: [0.25, 0.5, 0.75, 1],
    active: true,
  })
  await data.saveProfile({
    displayName: DEMO_NAME,
    phone: '9876543210',
    avatar: 'preset:sunrise',
  })

  useSession.getState().signUp({
    displayName: DEMO_NAME,
    email: DEMO_EMAIL,
    passcode: null,
    remember: true,
  })
}
