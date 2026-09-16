import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { TextField } from '@/components/ui/TextField'
import { Wordmark } from '@/components/ui/Wordmark'
import { BRAND } from '@/config/brand'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'

/**
 * §6 — one route, two modes, switched by `?mode=signup`.
 *
 * Creating an account here makes a **local** account: this build has no server
 * (§13), so there is nothing to verify a password against and no password field
 * is offered. See `data/store/session.ts` for why a locally-checked password
 * would be theatre rather than security. The screen says so plainly rather than
 * leaving people to assume otherwise.
 *
 * Signing up starts the app **empty**. A first-run demo household would put
 * somebody else's ₹18 L of debt on your dashboard and leave you deleting rows
 * before you could add your own.
 */

const SignUpForm = z.object({
  displayName: z.string().trim().min(1, 'Your name is needed — it is what the app greets you by.'),
  email: z.string().trim().email('That does not look like an email address.'),
})

export function Auth() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const account = useSession((state) => state.account)
  const signUp = useSession((state) => state.signUp)
  const signIn = useSession((state) => state.signIn)
  const clearEverything = useData((state) => state.clearEverything)
  const saveProfile = useData((state) => state.saveProfile)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ displayName?: string; email?: string }>({})
  const [busy, setBusy] = useState(false)

  const isSignup = params.get('mode') === 'signup'

  /*
   * `redirectTo` is attacker-controllable via the URL, so it is validated before
   * it is either navigated to or echoed back to the user.
   *
   * A single leading slash, rejecting `//host` and `/\host`: without this,
   * /auth?redirectTo=https://evil.com signs the user in and then throws
   * "External navigation is not allowed" inside the un-awaited navigate() — an
   * unhandled rejection (§12 wants zero console errors) that leaves them signed
   * in but stranded on /auth. The page also rendered the raw string back, which
   * put a legitimate-looking "You will be returned to https://evil.com" on our
   * own domain. RequireAuth only ever writes pathname + search, so nothing
   * legitimate is rejected.
   */
  const requested = params.get('redirectTo')
  const redirectTo = requested !== null && /^\/(?![/\\])/.test(requested) ? requested : null
  const destination = redirectTo ?? '/app/dashboard'

  async function handleSignUp(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const parsed = SignUpForm.safeParse({ displayName, email })

    if (!parsed.success) {
      const next: { displayName?: string; email?: string } = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'displayName' || field === 'email') next[field] = issue.message
      }
      setErrors(next)
      return
    }

    setErrors({})
    setBusy(true)

    /*
     * Order matters. Clear first, then write the profile — the other way round
     * and the clear wipes the profile that was just created.
     */
    await clearEverything()
    await saveProfile({ displayName: parsed.data.displayName, tier: 'silver' })
    signUp(parsed.data)

    void navigate(destination, { replace: true })
  }

  function handleSignIn(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    signIn()
    void navigate(destination, { replace: true })
  }

  return (
    <div className="bg-bg flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="text-title text-text font-bold tracking-tight">
          <Wordmark />
        </Link>

        <Card className="mt-6">
          <SectionLabel>{isSignup ? 'Create account' : 'Sign in'}</SectionLabel>
          <h1 className="text-heading text-text mt-2 font-bold tracking-tight">
            {isSignup ? 'Start from zero' : 'Welcome back'}
          </h1>

          {redirectTo === null ? null : (
            <p className="rounded-tile bg-surface-2 text-caption text-text-2 mt-4 p-3">
              You will be returned to <span className="text-text">{redirectTo}</span> after signing
              in.
            </p>
          )}

          {isSignup ? (
            <>
              <p className="text-meta text-text-2 mt-2">
                A new account is Silver — the free tier — and starts with nothing in it. Everything
                you enter stays on this device.
              </p>

              {/*
               * noValidate: the browser's own bubble would fire first and
               * suppress the validation below, and it cannot be styled, cannot
               * be read by a screen reader reliably, and says "Please fill in
               * this field" where this says what is actually wrong. `required`
               * stays for the semantics assistive tech reads.
               */}
              <form noValidate onSubmit={(event) => void handleSignUp(event)} className="mt-5">
                <TextField
                  label="Your name"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                  }}
                  autoComplete="name"
                  placeholder="Lakshay"
                  error={errors.displayName}
                  hint="What the dashboard greets you by."
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                  }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  error={errors.email}
                  hint="Used to identify your account. Not sent anywhere."
                  required
                />

                <AppButton type="submit" variant="primary" block className="mt-2" disabled={busy}>
                  {busy ? 'Setting up…' : 'Create account'}
                </AppButton>
              </form>

              {/*
               * Said once, plainly. People assume an account means a password and
               * a server; on a device-only build it means neither, and letting
               * them assume otherwise is the dishonest option.
               */}
              <p className="text-caption text-text-3 mt-4">
                No password: {BRAND.short} keeps your money data on this device and has no server to
                check one against. Use your phone or laptop screen lock to keep it private.
              </p>
            </>
          ) : account === null ? (
            <>
              <p className="text-meta text-text-2 mt-2">
                There is no account on this device yet. Your data lives here rather than on a
                server, so there is nothing to sign in to until you create one.
              </p>
              <AppButton
                variant="primary"
                block
                className="mt-5"
                onClick={() => {
                  void navigate('/auth?mode=signup', { replace: true })
                }}
              >
                Create an account
              </AppButton>
            </>
          ) : (
            <>
              <p className="text-meta text-text-2 mt-2">
                Signed out of <span className="text-text">{account.displayName}</span>. Your data is
                still here.
              </p>

              <form onSubmit={handleSignIn} className="mt-5">
                <TextField
                  label="Account"
                  value={account.email}
                  readOnly
                  hint="The account saved on this device."
                />
                <AppButton type="submit" variant="primary" block className="mt-2">
                  Sign in
                </AppButton>
              </form>
            </>
          )}

          <p className="text-caption text-text-2 mt-4 text-center">
            {isSignup ? 'Already have an account? ' : 'No account yet? '}
            <Link
              to={isSignup ? '/auth' : '/auth?mode=signup'}
              className="text-accent hover:text-accent-strong"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
