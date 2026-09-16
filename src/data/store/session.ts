import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The account on this device, and whether it is currently signed in.
 *
 * ── What this is, and what it is not ────────────────────────────────────────
 * §13 forbids a backend in v1, so there is no server to check a password
 * against. That makes the honest design a **local account**, not
 * authentication: the record below identifies you inside the app and nothing
 * more. There is deliberately no password field, because a password verified by
 * the same device that stores it protects nothing — anyone holding the phone can
 * read the database directly. Offering one would look like security and provide
 * none, which is worse than not offering it.
 *
 * What this does give: a real account to create, a name and email the app uses
 * as yours, a session that survives a restart, and a sign-out that works.
 *
 * When there is a server, this slice grows a token and `signIn` starts talking
 * to it. Nothing else in the app has to change, because nothing else reads the
 * account directly — screens read Profile through the repository (§8.1).
 */

const Account = z.object({
  displayName: z.string().min(1),
  /** Identity and contact, never a credential. */
  email: z.string().email(),
  createdAt: z.string().min(1),
})
export type Account = z.infer<typeof Account>

const PersistedSession = z.object({
  signedIn: z.boolean(),
  account: Account.nullable(),
})

type PersistedSession = z.infer<typeof PersistedSession>

/*
 * A fresh install starts signed out with no account, so the first thing anyone
 * sees is the landing page and then sign-up — and the app they land in is empty,
 * which is the point. The demo household is still one button away in Settings
 * for showing the app to somebody.
 */
const EMPTY: PersistedSession = {
  signedIn: false,
  account: null,
}

type SessionState = PersistedSession & {
  /** Creates the local account and signs in. Clearing data is the caller's job. */
  signUp: (details: { displayName: string; email: string }) => void
  /** Signs back into the account already on this device. No-op when there is none. */
  signIn: () => void
  signOut: () => void
  /** Removes the account itself, not just the session. */
  forgetAccount: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,

      signUp: ({ displayName, email }) => {
        set({
          signedIn: true,
          account: {
            displayName,
            email,
            createdAt: new Date().toISOString(),
          },
        })
      },

      signIn: () => {
        set((state) => (state.account === null ? state : { ...state, signedIn: true }))
      },

      signOut: () => {
        set({ signedIn: false })
      },

      forgetAccount: () => {
        set({ ...EMPTY })
      },
    }),
    {
      name: 'wrc.session',
      version: 3,

      /* Persist data only — never the action functions. */
      partialize: (state) => ({ signedIn: state.signedIn, account: state.account }),

      /* v2 had a bare `signedIn: true` and no account. There is nothing to carry
         forward from it, so a migrating install lands on sign-up. */
      migrate: () => EMPTY,

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
            'wrc.session failed validation; reseeding this slice only.',
            parsed.error.issues,
          )
          return { ...current, ...EMPTY }
        }
        return { ...current, ...parsed.data }
      },
    },
  ),
)
