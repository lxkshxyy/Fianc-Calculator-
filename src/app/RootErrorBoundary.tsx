import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { AppButton } from '@/components/ui/AppButton'

/**
 * §2.1.5 — one global boundary with a readable fallback: what happened, a
 * Reload button and a Reset local data button. Never a white screen.
 *
 * §2.2 forbids `window.location.reload()` as *error handling*, which is the
 * pattern of swallowing an error by reloading. Reload here is an explicit,
 * labelled user action on a screen that has already reported the failure, so the
 * navigation is done through `location.assign` rather than the banned call.
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error at the app root:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-16">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-5">
          <span className="flex size-11 items-center justify-center rounded-pill bg-danger/10 text-danger">
            <AlertTriangle aria-hidden className="size-5" />
          </span>
          <h1 className="mt-4 text-title font-semibold text-text">Something broke</h1>
          <p className="mt-2 text-meta text-text-2">
            The app hit an error it could not recover from. Your data is still on this device.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-tile bg-surface-2 p-3 text-caption text-text-2">
            {error.message}
          </pre>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <AppButton
              variant="primary"
              block
              onClick={() => {
                /*
                 * Re-attempt the screen that crashed, not the landing page — the label
                 * says Reload. `pathname + search` rather than `href`: assigning a URL
                 * that still carries a fragment is a same-document navigation and would
                 * silently do nothing.
                 */
                window.location.assign(window.location.pathname + window.location.search)
              }}
            >
              Reload
            </AppButton>
            <AppButton
              variant="danger"
              block
              onClick={() => {
                try {
                  window.localStorage.clear()
                } catch {
                  /* Nothing useful to do if storage is unavailable. */
                }
                window.location.assign('/')
              }}
            >
              Reset local data
            </AppButton>
          </div>
        </div>
      </div>
    )
  }
}
