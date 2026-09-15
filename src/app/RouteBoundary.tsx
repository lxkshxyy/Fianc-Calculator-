import { AlertTriangle } from 'lucide-react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * §2.1.4 — the fallback shown while a lazily loaded route is still arriving.
 * §10.7 — every block has a fixed height, so the real screen replacing it does
 * not shift the page under the user's thumb.
 */
export function RouteSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton height={34} width="42%" />
      <Skeleton height={16} width="28%" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} height={112} rounded="card" />
        ))}
      </div>
      <Skeleton height={220} rounded="card" />
    </div>
  )
}

/**
 * §2.1.4 — the per-route boundary. A crash inside one module must never blank
 * the whole app, so this renders inside the shell: the sidebar, tab bar and
 * header all survive and the user can navigate away.
 */
export function RouteErrorBoundary({ standalone = false }: { standalone?: boolean } = {}) {
  const error = useRouteError()
  const navigate = useNavigate()

  const message = isRouteErrorResponse(error)
    ? error.status + ' ' + error.statusText
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  const card = (
    <Card>
      <SectionLabel>Error</SectionLabel>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold text-text">This screen could not load</h2>
          <p className="mt-1 text-meta text-text-2">
            {standalone
              ? 'Head back to the dashboard and try again from there.'
              : 'The rest of the app is still working — use the navigation to go somewhere else.'}
          </p>
          <pre className="mt-3 max-h-28 overflow-auto rounded-tile bg-surface-2 p-3 text-caption text-text-2">
            {message}
          </pre>
          <div className="mt-4 flex gap-2">
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => {
                void navigate(0)
              }}
            >
              Try again
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigate('/app/dashboard')
              }}
            >
              Go to dashboard
            </AppButton>
          </div>
        </div>
      </div>
    </Card>
  )

  /* Outside AppLayout there is no shell to sit inside, so it centres itself. */
  if (standalone) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-16">
        <div className="w-full max-w-md">{card}</div>
      </div>
    )
  }

  return card
}
