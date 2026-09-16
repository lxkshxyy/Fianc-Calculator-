import { useEffect, type ReactNode } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { useData } from '@/data/store/data'

/**
 * Opens storage once, before the shell renders anything that reads it.
 *
 * §2.1.6 — the repository never rejects: a missing or blocked IndexedDB degrades
 * to memory rather than throwing. So the only reachable failure here is a bug in
 * our own code, and it gets a readable card with a retry rather than a blank
 * screen (§2.1.5).
 *
 * §2.1.8 — the loading state is a fixed-height skeleton, not a spinner that
 * collapses to nothing and shifts the page under the user's thumb when data lands.
 */
export function DataGate({ children }: { children: ReactNode }) {
  const status = useData((state) => state.status)
  const error = useData((state) => state.error)
  const load = useData((state) => state.load)

  useEffect(() => {
    if (status === 'idle') void load()
  }, [status, load])

  if (status === 'error') {
    return (
      <div className="mx-auto w-full max-w-md py-10">
        <Card>
          <h2 className="text-text text-lg font-semibold">Your data could not be opened</h2>
          <p className="text-text-2 mt-2 text-sm">
            {error ?? 'Storage did not respond.'} Your records are still on this device.
          </p>
          <div className="mt-4">
            <AppButton
              onClick={() => {
                void load()
              }}
            >
              Try again
            </AppButton>
          </div>
        </Card>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="space-y-4 py-2" aria-busy="true" aria-label="Loading your data">
        <div className="border-border bg-surface h-[132px] animate-pulse rounded-[14px] border" />
        <div className="border-border bg-surface h-[220px] animate-pulse rounded-[14px] border" />
        <div className="border-border bg-surface h-[180px] animate-pulse rounded-[14px] border" />
      </div>
    )
  }

  return <>{children}</>
}
