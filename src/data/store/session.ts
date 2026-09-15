import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The route guard's backing store, and nothing else.
 *
 * §13 forbids a backend or an auth provider in v1, so "signed in" is a local
 * flag, not a credential. It lives on a prefs/UI slice — the one place §8.1
 * allows `persist`, since no domain entity is stored here.
 *
 * Phase 3 moved `displayName` and `tier` out to the Profile record read through
 * `repo/`. Two sources of truth for tier is exactly the drift §8.1 exists to
 * prevent: the paywall would gate on one copy while the badge rendered the other.
 *
 * It defaults to signed in because §8.3 seeds a demo household on first run and
 * §12 expects seed data visible on every screen on a fresh install. Signing out
 * from the More sheet is what exercises the guard's redirect.
 */

const PersistedSession = z.object({
  signedIn: z.boolean(),
})

type PersistedSession = z.infer<typeof PersistedSession>

const SEEDED: PersistedSession = {
  signedIn: true,
}

type SessionState = PersistedSession & {
  signIn: () => void
  signOut: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...SEEDED,
      signIn: () => {
        set({ signedIn: true })
      },
      signOut: () => {
        set({ signedIn: false })
      },
    }),
    {
      name: 'prosperitypath.session',
      version: 2,

      /* Persist data only — never the action functions. */
      partialize: (state) => ({ signedIn: state.signedIn }),

      migrate: () => SEEDED,

      /*
       * §2.1.6 — validate everything read from storage; on parse failure reset
       * *that slice only* and carry on. zustand's default merge is a shallow
       * spread, so without this an arbitrary localStorage value becomes the
       * store and one bad key bricks every private route until storage is
       * cleared by hand.
       */
      merge: (persisted, current) => {
        const parsed = PersistedSession.safeParse(persisted)
        if (!parsed.success) {
          console.warn(
            'prosperitypath.session failed validation; reseeding this slice only.',
            parsed.error.issues,
          )
          return { ...current, ...SEEDED }
        }
        return { ...current, ...parsed.data }
      },
    },
  ),
)
