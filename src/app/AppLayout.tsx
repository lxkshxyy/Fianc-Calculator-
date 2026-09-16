import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { PreviewBanner } from '@/components/ui/PreviewBanner'
import { DataGate } from './DataGate'
import { RouteSkeleton } from './RouteBoundary'
import { AppHeader } from './nav/AppHeader'
import { BottomTabs } from './nav/BottomTabs'
import { MoreSheet } from './nav/MoreSheet'
import { Sidebar } from './nav/Sidebar'

/**
 * §10.6 — a dev-only warning when the page scrolls horizontally.
 *
 * Kept out of production by `import.meta.env.DEV`, which §2.1.9 allows because
 * it is read through `import.meta.env` and Vite replaces it with a literal at
 * build time, so the whole block is dropped from the bundle.
 */
function useHorizontalScrollGuard(): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const check = (): void => {
      const { body } = document
      if (body.scrollWidth > body.clientWidth) {
        console.warn(
          '§10.6 horizontal page scroll: body.scrollWidth ' +
            body.scrollWidth +
            ' > clientWidth ' +
            body.clientWidth +
            '. A child is wider than the viewport — give it its own overflow container.',
        )
      }
    }

    check()

    /*
     * ResizeObserver is feature-detected, not assumed. It is absent in jsdom and
     * in older webviews, and an unguarded `new ResizeObserver` there throws
     * during render and blanks the shell — the exact failure §2.1 exists to
     * prevent, for the sake of a dev-only warning. The resize listener is the
     * fallback; §10.11 wants a re-measure on orientation change either way.
     */
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check)
    observer?.observe(document.body)
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])
}

/**
 * The private app shell.
 *
 * §10.1 — **one scroll owner**: the document scrolls. Nothing here sets
 * `overflow-y: auto`; the sidebar is the single allowed exception and owns its
 * own container. §10.2 uses `100dvh`, never `100vh`.
 *
 * §5.2 — the bottom bar is fixed, so the content gets bottom padding equal to
 * its height (56px) plus the safe-area inset, and nothing hides behind it. That
 * padding drops away at `lg`, where the bar is not rendered at all.
 */
export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  useHorizontalScrollGuard()

  /*
   * MoreSheet navigates, and browser back/forward can move the route while it is
   * open; without this it stays open over a screen it never belonged to.
   *
   * This is React's documented "adjusting state when a value changes" pattern —
   * a render-phase set, which React re-runs immediately without committing the
   * intermediate paint. An effect here would be a cascading render, which is
   * what react-hooks/set-state-in-effect correctly rejects.
   */
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMoreOpen(false)
  }

  return (
    <div className="bg-bg min-h-dvh lg:pl-[260px]">
      <Sidebar />

      <div className="flex min-h-dvh flex-col">
        <PreviewBanner />
        <AppHeader
          onOpenMore={() => {
            setMoreOpen(true)
          }}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:pb-10">
          <DataGate>
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </DataGate>
        </main>
      </div>

      <BottomTabs
        onOpenMore={() => {
          setMoreOpen(true)
        }}
      />

      <MoreSheet
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false)
        }}
      />
    </div>
  )
}
