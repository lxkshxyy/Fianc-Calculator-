import { KeyRound, LifeBuoy, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { BRAND } from '@/config/brand'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { PublicShell } from './PublicShell'

/**
 * There is no password reset in the usual sense, and this page says why rather
 * than sending an email that could never arrive.
 *
 * The password is a lock on this device (lib/passcode.ts, store/session.ts):
 * nothing off the device holds a copy, so nobody — the WRC team included — can
 * reset it. What is possible is starting over here, which erases the account
 * and everything stored with it. That is behind a second, explicit step.
 */
export function ForgotPassword() {
  const navigate = useNavigate()
  const account = useSession((state) => state.account)
  const forgetAccount = useSession((state) => state.forgetAccount)
  const clearEverything = useData((state) => state.clearEverything)

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function startOver(): Promise<void> {
    setBusy(true)
    try {
      await clearEverything()
      forgetAccount()
      void navigate('/auth?mode=signup', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicShell title="Forgot password">
      <section className="mx-auto max-w-2xl py-12">
        <KeyRound aria-hidden className="text-gold size-6" />
        <h1 className="text-text mt-3 text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Forgot your password?
        </h1>
        <p className="text-lead text-text-2 mt-3">
          Your password locks {BRAND.short} on the device where you created your account. There is
          no server holding a copy, so there is no reset link to email — and nobody, the{' '}
          {BRAND.short} team included, can see it or change it.
        </p>

        <div className="mt-8 space-y-4">
          <Card>
            <h2 className="text-text font-semibold">Try it again</h2>
            <p className="text-text-2 mt-1.5 text-sm">
              Passwords are case-sensitive. Use the same device and browser you signed up on.
            </p>
            <Link
              to="/auth?mode=login"
              className={buttonClass({ variant: 'primary', size: 'sm' }, 'mt-4')}
            >
              Back to log in
            </Link>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <RotateCcw aria-hidden className="text-text-2 size-4" />
              <h2 className="text-text font-semibold">Start over on this device</h2>
            </div>
            {account === null ? (
              <p className="text-text-2 mt-1.5 text-sm">
                There is no account on this device, so there is nothing to reset.{' '}
                <Link to="/auth?mode=signup" className="text-accent font-semibold">
                  Create one
                </Link>{' '}
                in under a minute.
              </p>
            ) : confirming ? (
              <div role="group" aria-label="Confirm erasing this device">
                <p className="text-text mt-1.5 text-sm font-medium">
                  This erases {account.displayName}’s account and every figure stored with it.
                </p>
                <p className="text-caption text-text-2 mt-1">
                  There is no copy anywhere else, so it cannot be undone.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AppButton
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      void startOver()
                    }}
                  >
                    {busy ? 'Erasing…' : 'Yes, erase and start over'}
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfirming(false)
                    }}
                  >
                    Cancel
                  </AppButton>
                </div>
              </div>
            ) : (
              <>
                <p className="text-text-2 mt-1.5 text-sm">
                  Erase the account on this device and everything stored with it, then create a new
                  one.
                </p>
                <AppButton
                  size="sm"
                  variant="danger"
                  className="mt-4"
                  onClick={() => {
                    setConfirming(true)
                  }}
                >
                  Start over
                </AppButton>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <LifeBuoy aria-hidden className="text-text-2 size-4" />
              <h2 className="text-text font-semibold">Need a hand?</h2>
            </div>
            <p className="text-text-2 mt-1.5 text-sm">
              The team cannot unlock your device, but can help you get set up again.
            </p>
            <Link
              to="/contact"
              className="rounded-tile text-gold mt-3 inline-block text-sm font-medium underline underline-offset-2"
            >
              Contact the team
            </Link>
          </Card>
        </div>
      </section>
    </PublicShell>
  )
}
