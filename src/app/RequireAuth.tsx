import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useSession } from '@/data/store/session'

/**
 * §6 — unauthenticated visitors are sent to /auth with a `redirectTo` param.
 *
 * "Never render a private screen in a half-authenticated state": the redirect is
 * returned *instead of* the children, so no private subtree ever mounts, not even
 * for a frame. `replace` keeps the guarded URL out of history, so Back from the
 * auth screen does not bounce between the two.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const signedIn = useSession((state) => state.signedIn)
  const location = useLocation()

  if (!signedIn) {
    const redirectTo = location.pathname + location.search
    return <Navigate to={'/auth?redirectTo=' + encodeURIComponent(redirectTo)} replace />
  }

  return <>{children}</>
}
