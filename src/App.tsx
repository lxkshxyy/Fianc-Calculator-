import { RouterProvider } from 'react-router-dom'

import { RootErrorBoundary } from '@/app/RootErrorBoundary'
import { router } from '@/app/router'
import { applyDensity } from '@/config/density'
import { applyTheme, readStoredTheme } from '@/lib/theme'

/*
 * §12 — "Theme toggle works on every route without a flash of the wrong theme."
 * The stamp is applied at module evaluation, before React renders, so the first
 * paint is already in the right theme. `system` stamps nothing and leaves the
 * media query in charge (§4.1).
 */
applyTheme(readStoredTheme())
applyDensity()

export function App() {
  return (
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  )
}
