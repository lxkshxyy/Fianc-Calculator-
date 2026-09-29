import { ArrowRight, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { DEMO_NAME, isDemoAccount, openShowcase } from '@/data/seed/showcase'
import { useSession } from '@/data/store/session'
import { cn } from '@/lib/cn'

/**
 * "Explore the demo" — the website's way into a filled-in app without signing up.
 *
 * Three cases, because the data lives in the visitor's own browser:
 *
 *   - nothing here yet        → load the showcase household and open it
 *   - the demo is already here → sign straight back into it, changes kept
 *   - someone's real account   → say what would be replaced, and wait for a yes
 *
 * The third is the one that matters. A demo button that silently wipes a real
 * member's figures would be the most expensive click on the site.
 */
export function DemoEntry({
  size = 'md',
  block = false,
  className,
}: {
  size?: 'md' | 'sm'
  block?: boolean
  className?: string
}) {
  const navigate = useNavigate()
  const account = useSession((state) => state.account)
  const signIn = useSession((state) => state.signIn)

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const demoHere = isDemoAccount(account)
  const realAccountHere = account !== null && !demoHere

  async function open(): Promise<void> {
    setError(null)
    if (demoHere) {
      signIn({ remember: true })
      void navigate('/app/dashboard')
      return
    }
    setBusy(true)
    try {
      await openShowcase()
      void navigate('/app/dashboard')
    } catch {
      setError('The demo could not be opened in this browser. Private windows sometimes block it.')
    } finally {
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <div
        role="group"
        aria-label="Replace this browser's account with the demo"
        className={cn('rounded-card border-warn/40 bg-surface border p-4 text-left', className)}
      >
        <p className="text-text text-sm font-medium">
          This browser already has {account?.displayName ?? 'an'}’s account.
        </p>
        <p className="text-caption text-text-2 mt-1">
          The demo replaces it, and every figure in it, with {DEMO_NAME}’s sample household. Nothing
          is kept anywhere else, so this cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AppButton
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              void open()
            }}
          >
            {busy ? 'Opening…' : 'Replace it with the demo'}
          </AppButton>
          <AppButton
            size="sm"
            variant="ghost"
            onClick={() => {
              setConfirming(false)
            }}
          >
            Keep my account
          </AppButton>
        </div>
        {error === null ? null : (
          <p role="alert" className="text-caption text-danger mt-2">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn(block ? 'w-full' : 'inline-flex flex-col', className)}>
      <AppButton
        size={size}
        variant="outline"
        block={block}
        disabled={busy}
        onClick={() => {
          if (realAccountHere) setConfirming(true)
          else void open()
        }}
      >
        <PlayCircle aria-hidden className="text-accent size-4" />
        {busy ? 'Opening the demo…' : demoHere ? 'Continue the demo' : 'Explore the demo'}
        <ArrowRight aria-hidden className="size-4" />
      </AppButton>
      {error === null ? null : (
        <p role="alert" className="text-caption text-danger mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
