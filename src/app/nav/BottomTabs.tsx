import { useLocation, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { TABS, activeTabFor, type TabId } from './navigation'

/**
 * §5.2 — five tabs, mobile only, never a sidebar. Fixed to the bottom.
 *
 * §10.3 — the bar's height is 56px **plus** `env(safe-area-inset-bottom)`, which
 * resolves to a real value only because Phase 0 put `viewport-fit=cover` on the
 * viewport meta tag. The matching bottom padding on the scroll container lives
 * in AppLayout so nothing hides behind the bar.
 *
 * §10.8 — each target is the full 56px tall and at least a fifth of the screen
 * wide, clearing 44x44 at every supported width.
 */
export function BottomTabs({ onOpenMore }: { onOpenMore: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  /* useLocation, not window.location — the latter does not re-render on navigation. */
  const location = useLocation()
  const active: TabId | null = activeTabFor(location.pathname)

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'border-border bg-bg-elevated fixed inset-x-0 bottom-0 z-40 border-t lg:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (tab.to === null) {
                    onOpenMore()
                  } else {
                    void navigate(tab.to)
                  }
                }}
                className={cn(
                  'flex size-full flex-col items-center justify-center gap-1 px-1',
                  'transition-colors duration-150',
                  isActive ? 'text-gold' : 'text-text-2',
                )}
              >
                <tab.icon aria-hidden className="size-5" />
                <span className="text-micro leading-none">{t(tab.labelKey)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
