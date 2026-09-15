import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSession } from '@/data/store/session'

/**
 * §6 — one route, two modes, switched by `?mode=signup`.
 *
 * Phase 9 builds the real forms. What exists here in Phase 2 is the half the
 * guard needs: reading `redirectTo` and returning the user to where they were
 * sent from. §13 forbids an auth provider in v1, so signing in flips a local
 * flag (see `data/store/session.ts`).
 */
export function Auth() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signIn = useSession((state) => state.signIn)

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
  const redirectTo =
    requested !== null && /^\/(?![/\\])/.test(requested) ? requested : null

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="text-title font-bold tracking-tight text-text">
          Prosperity<span className="text-gold">Path</span>
        </Link>

        <Card className="mt-6">
          <SectionLabel>{isSignup ? 'Create account' : 'Sign in'}</SectionLabel>
          <h1 className="mt-2 text-heading font-bold tracking-tight text-text">
            {isSignup ? 'Start your path' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-meta text-text-2">
            Phase 9 builds the real form. A new account is Silver — the free tier.
          </p>

          {redirectTo === null ? null : (
            <p className="mt-4 rounded-tile bg-surface-2 p-3 text-caption text-text-2">
              You will be returned to <span className="text-text">{redirectTo}</span> after signing
              in.
            </p>
          )}

          <AppButton
            variant="primary"
            block
            className="mt-5"
            onClick={() => {
              signIn()
              void navigate(redirectTo ?? '/app/dashboard', { replace: true })
            }}
          >
            {isSignup ? 'Create account' : 'Sign in'}
          </AppButton>

          <p className="mt-4 text-center text-caption text-text-2">
            {isSignup ? 'Already have an account? ' : 'No account yet? '}
            <Link
              to={isSignup ? '/auth' : '/auth?mode=signup'}
              className="text-gold hover:text-gold-strong"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
