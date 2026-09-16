import { MoreVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProfile } from '@/data/store/data'
import { cn } from '@/lib/cn'
import { routeMetaFor } from './navigation'

/**
 * §5.3 — desktop shows title + subtitle left and actions right; mobile is a
 * compact sticky bar whose title collapses from 34px to 20px on scroll.
 *
 * §10.10 — the collapse exists so a sticky header does not eat a third of a
 * small screen. The scroll listener is passive and only flips a boolean, so it
 * never blocks scrolling.
 *
 * §10.3 — top padding clears the notch via `env(safe-area-inset-top)`.
 */
export function AppHeader({ onOpenMore }: { onOpenMore: () => void }) {
  const location = useLocation()
  const tier = useProfile()?.tier ?? 'silver'
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const onScroll = (): void => {
      /*
       * Sheet.tsx's scroll lock sets body{position:fixed}, which clamps scrollY to
       * 0 and fires a scroll event. Without this the header un-collapses and the
       * page visibly grows behind the 70%-opaque scrim, then snaps back on close.
       */
      if (document.body.style.position === 'fixed') return
      setCollapsed(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const meta = routeMetaFor(location.pathname)
  const title = meta?.title ?? 'ProsperityPath'
  const subtitle = meta?.subtitle ?? ''

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur',
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 transition-all duration-150 sm:px-6',
          collapsed ? 'py-2' : 'py-3 lg:py-5',
        )}
      >
        <div className="min-w-0">
          <h1
            className={cn(
              'truncate font-bold tracking-tight text-text transition-all duration-150',
              /*
               * Was `text-title : text-title lg:text-page`, which collapsed only at
               * lg — the one breakpoint §5.3 does not ask for — and never on mobile,
               * the one it does. 34px -> 20px now happens at every width.
               */
              collapsed ? 'text-title' : 'text-page',
            )}
          >
            {title}
          </h1>
          {subtitle === '' || collapsed ? null : (
            <p className="hidden truncate text-meta text-text-2 lg:block">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <TierBadge tier={tier} size="sm" />
          <AppButton
            variant="ghost"
            size="icon"
            aria-label="More"
            className="lg:hidden"
            onClick={onOpenMore}
          >
            <MoreVertical aria-hidden className="size-4" />
          </AppButton>
        </div>
      </div>
    </header>
  )
}
