import { ArrowLeft, Construction } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { Wordmark } from '@/components/ui/Wordmark'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSession } from '@/data/store/session'

const PUBLIC_TITLES: Record<string, string> = {
  '/': 'Landing',
  '/features': 'Feature catalogue',
  '/request-centre': 'Request Centre',
  '/about': 'About',
  '/contact': 'Contact',
  '/forgot-password': 'Reset password',
}

/**
 * The Phase 2 placeholder for the public routes. Phase 9 builds the real pages.
 *
 * It carries the "back to dashboard" affordance the route-map reconciliation
 * promised: Request Centre sits in the app's TOOLS group but is a public screen
 * (§9.3 — available without login), so following it leaves the shell. Without a
 * way back, a signed-in user who taps it is stranded.
 */
export function PublicStub() {
  const location = useLocation()
  const params = useParams()
  const signedIn = useSession((state) => state.signedIn)

  const service = params['service']
  const doc = params['doc']
  const base = '/' + (location.pathname.split('/').filter(Boolean)[0] ?? '')

  const title =
    service !== undefined
      ? 'Request: ' + service
      : doc !== undefined
        ? 'Legal: ' + doc
        : (PUBLIC_TITLES[location.pathname] ?? PUBLIC_TITLES[base] ?? 'Public page')

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="text-title text-text font-bold tracking-tight">
          <Wordmark />
        </Link>
        {signedIn ? (
          <Link
            to="/app/dashboard"
            className="rounded-button border-border text-meta text-text hover:border-border-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-2 border px-3 transition-colors duration-150"
          >
            Back to dashboard
          </Link>
        ) : null}
      </div>

      <SectionLabel>Public</SectionLabel>
      <Card className="mt-3">
        <EmptyState
          icon={Construction}
          title={title}
          description="Phase 9 builds the public site. The route resolves and the 404 does not catch it."
          action={
            <Link
              to="/"
              className="rounded-button text-meta text-text-2 hover:text-text inline-flex min-h-11 items-center gap-2 px-3"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Home
            </Link>
          }
        />
      </Card>
    </div>
  )
}
