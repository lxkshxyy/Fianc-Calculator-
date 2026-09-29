import { AlertTriangle, WifiOff } from 'lucide-react'
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom'

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

/*
 * The messages each browser uses when the file behind a lazily loaded screen
 * cannot be fetched: the server stopped, the connection dropped, or a new
 * version was published and the old file names are gone.
 */
const CHUNK_FAILURE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading (css )?chunk .* failed/i

function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_FAILURE.test(error.message)
}

/**
 * §2.1.4 — the per-route boundary. A crash inside one module must never blank
 * the whole app, so this renders inside the shell: the sidebar, tab bar and
 * header all survive and the user can navigate away.
 *
 * A screen that simply failed to download is not a crash, and on the website a
 * visitor was shown one as if it were — "This screen could not load" over a raw
 * `Failed to fetch dynamically imported module: http://…` line, with a button to
 * a dashboard they had no account for. That case now says what happened in
 * plain words, keeps the technical line under Details, and offers the way back
 * that fits where the visitor is: the dashboard inside the app, the home page
 * outside it. (It does not reload by itself — §2.2 rules that out as error
 * handling; "Try again" is the visitor's choice.)
 */
export function RouteErrorBoundary({ standalone = false }: { standalone?: boolean } = {}) {
  const error = useRouteError()
  const navigate = useNavigate()
  const location = useLocation()

  const chunk = isChunkLoadError(error)
  const inApp = location.pathname.startsWith('/app')

  const message = isRouteErrorResponse(error)
    ? error.status + ' ' + error.statusText
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  const title = chunk ? 'This page did not finish loading' : 'This screen could not load'
  const line = chunk
    ? 'The connection to the site dropped while it was opening. Check your internet and try again.'
    : standalone
      ? 'Head back to the dashboard and try again from there.'
      : 'The rest of the app is still working — use the navigation to go somewhere else.'

  const card = (
    <Card>
      <SectionLabel>{chunk ? 'Connection' : 'Error'}</SectionLabel>
      <div className="mt-3 flex items-start gap-3">
        <span className="rounded-tile bg-danger/10 text-danger flex size-9 shrink-0 items-center justify-center">
          {chunk ? (
            <WifiOff aria-hidden className="size-4" />
          ) : (
            <AlertTriangle aria-hidden className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-title text-text font-semibold">{title}</h2>
          <p className="text-meta text-text-2 mt-1">{line}</p>
          {chunk ? (
            <details className="mt-3">
              <summary className="text-caption text-text-3 cursor-pointer">Details</summary>
              <pre className="rounded-tile bg-surface-2 text-caption text-text-2 mt-2 max-h-28 overflow-auto p-3 whitespace-pre-wrap">
                {message}
              </pre>
            </details>
          ) : (
            <pre className="rounded-tile bg-surface-2 text-caption text-text-2 mt-3 max-h-28 overflow-auto p-3">
              {message}
            </pre>
          )}
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
                window.location.assign(inApp || standalone ? '/app/dashboard' : '/')
              }}
            >
              {inApp || standalone ? 'Go to dashboard' : 'Go to the home page'}
            </AppButton>
          </div>
        </div>
      </div>
    </Card>
  )

  /* Outside AppLayout — the 404 route and every public page — there is no shell
     to sit inside, so it centres itself rather than hugging the top edge. */
  if (standalone || !inApp) {
    return (
      <div className="bg-bg flex min-h-dvh items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">{card}</div>
      </div>
    )
  }

  return card
}
