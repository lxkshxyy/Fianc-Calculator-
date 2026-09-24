import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Passcode } from '@/lib/passcode'

/**
 * The account on this device, and whether it is currently signed in.
 *
 * ── What this is, and what it is not ────────────────────────────────────────
 * §13 forbids a backend in v1, so there is no server to check a password
 * against. That makes this a **local account with a local lock**, not
 * authentication. The password is real — it is asked for, checked, and wrong
 * answers are refused — and what it buys is that somebody who picks up an
 * unlocked phone sees a sign-in screen rather than a net worth. What it cannot
 * buy is an account anywhere else: nothing is verified off the device, and a
 * determined person holding the phone can read the database directly. The
 * sign-up screen says exactly that, because letting people assume otherwise
 * about their own money is the one thing worse than having no password.
 *
 * The password itself never reaches this file. `lib/passcode.ts` turns it into
 * a salted PBKDF2 record on the way in and compares against that record on the
 * way back; what is stored is `{ salt, hash, iterations }` and nothing else.
 *
 * What this does give: a real account to create, a name and email the app uses
 * as yours, a session that survives a restart when asked to, and a sign-out
 * that works.
 *
 * When there is a server, this slice grows a token and `signIn` starts talking
 * to it. Nothing else in the app has to change, because nothing else reads the
 * account directly — screens read Profile through the repository (§8.1).
 */

const StoredPasscode = z.object({
  salt: z.string().min(1),
  hash: z.string().min(1),
  iterations: z.number().int().positive(),
})

const Account = z.object({
  displayName: z.string().min(1),
  /** Identity and contact, never a credential. */
  email: z.string().email(),
  createdAt: z.string().min(1),
  /**
   * Null for an account made before passwords existed, and for one created on a
   * connection with no secure crypto (see `isPasswordSupported`).
   *
   * Nullable rather than required on purpose. Making it required would mean
   * bumping the persisted version, and this store resets on a version bump —
   * which would have signed out every existing install and dropped the account
   * behind their data. A null passcode instead means "no lock set yet", and the
   * sign-in screen offers to set one.
   */
  passcode: StoredPasscode.nullable().default(null),
})
export type Account = z.infer<typeof Account>

const PersistedSession = z.object({
  signedIn: z.boolean(),
  account: Account.nullable(),
  /**
   * Whether the session should outlive a restart — the "Remember me" tick.
   *
   * Defaulted rather than required for the same reason as `passcode`: an
   * install persisted before this existed still parses, and lands on the
   * remembered behaviour it already had.
   */
  remember: z.boolean().default(true),
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
  remember: true,
}

type SessionState = PersistedSession & {
  /**
   * Creates the local account and signs in. Clearing data is the caller's job.
   *
   * `passcode` is already hashed by the time it arrives — the screen does that,
   * because it is async and this store is not.
   */
  signUp: (details: {
    displayName: string
    email: string
    passcode: Passcode | null
    remember?: boolean
  }) => void
  /**
   * Signs back into the account already on this device. No-op when there is none.
   *
   * The password check happens in the screen, against `account.passcode`, before
   * this is called: verification is async and this store is deliberately not.
   */
  signIn: (options?: { remember?: boolean }) => void
  /** Sets or replaces the lock on the existing account. Already hashed. */
  setPasscode: (passcode: Passcode) => void
  /**
   * Renames the account or changes its email, from the Profile screen.
   *
   * The name is also on the Profile record, which is what every screen reads;
   * this copy is the one the sign-in screen shows ("Log in as …"), so the two
   * are written together rather than left to disagree.
   */
  updateAccount: (details: { displayName?: string; email?: string }) => void
  signOut: () => void
  /** Removes the account itself, not just the session. */
  forgetAccount: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,

      signUp: ({ displayName, email, passcode, remember = true }) => {
        set({
          signedIn: true,
          remember,
          account: {
            displayName,
            email,
            createdAt: new Date().toISOString(),
            passcode,
          },
        })
      },

      signIn: ({ remember = true } = {}) => {
        set((state) => (state.account === null ? state : { ...state, signedIn: true, remember }))
      },

      setPasscode: (passcode) => {
        set((state) =>
          state.account === null ? state : { ...state, account: { ...state.account, passcode } },
        )
      },

      updateAccount: (details) => {
        set((state) =>
          state.account === null
            ? state
            : {
                ...state,
                account: {
                  ...state.account,
                  ...(details.displayName === undefined
                    ? {}
                    : { displayName: details.displayName }),
                  ...(details.email === undefined ? {} : { email: details.email }),
                },
              },
        )
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
      partialize: (state) => ({
        signedIn: state.signedIn,
        account: state.account,
        remember: state.remember,
      }),

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
        /*
         * "Remember me" is what makes the persisted `signedIn` mean anything.
         * Unticked, the session is meant to last until the app closes, so it is
         * dropped here — on the way back out of storage — rather than by trying
         * to not write it. Writing it and ignoring it on read is the version
         * that survives a crash, a force-quit and a phone running out of
         * battery; a beforeunload handler is the version that does not.
         */
        const restored = parsed.data.remember ? parsed.data : { ...parsed.data, signedIn: false }
        return { ...current, ...restored }
      },
    },
  ),
)
