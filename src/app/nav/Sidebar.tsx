import { ChevronRight, ExternalLink } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { SectionLabel } from '@/components/ui/SectionLabel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProfile } from '@/data/store/data'
import { cn } from '@/lib/cn'
import { APP_BASE, NAV_GROUPS } from './navigation'

/**
 * §5.1 — 260px, fixed, desktop only. Never rendered below `lg` (§5.2).
 *
 * §10.1 names the sidebar as one of only two places allowed their own scroll
 * container, and §10.4 requires `overscroll-behavior: contain` so reaching the
 * end does not start dragging the page behind it.
 */
export function Sidebar() {
  const profile = useProfile()
  const displayName = profile?.displayName ?? 'You'
  const tier = profile?.tier ?? 'silver'

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r border-border bg-bg-elevated lg:flex">
      {/* §5.1 — "Top: wordmark + theme toggle." Two rows rather than one: three
          44px segments (§10.8) plus the wordmark do not fit across 260px. */}
      <div className="flex flex-col gap-3 px-4 pt-5 pb-4">
        <span className="px-1 text-title font-bold tracking-tight text-text">
          Prosperity<span className="text-gold">Path</span>
        </span>
        <ThemeToggle />
      </div>

      <div className="mx-4 mb-4 flex items-center gap-3 rounded-tile bg-surface-2 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-gold/15 text-body font-semibold text-gold">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-meta font-medium text-text">{displayName}</p>
          <TierBadge tier={tier} size="sm" className="mt-1" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-5">
            <SectionLabel className="px-2 pb-2">{group.label}</SectionLabel>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const to = item.external === true ? item.path : APP_BASE + '/' + item.path
                return (
                  <li key={item.path}>
                    <NavLink
                      to={to}
                      end={item.external !== true}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex min-h-11 items-center gap-2.5 rounded-tile pr-2 pl-3 text-meta',
                          'transition-colors duration-150',
                          isActive && item.external !== true
                            ? 'bg-surface font-medium text-gold'
                            : 'text-text-2 hover:bg-surface-2 hover:text-text',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && item.external !== true ? (
                            <span
                              aria-hidden
                              className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-pill bg-gold"
                            />
                          ) : null}
                          <item.icon aria-hidden className="size-4 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.external === true ? (
                            <ExternalLink
                              aria-label="(leaves the app)"
                              className="size-3.5 shrink-0 text-text-3"
                            />
                          ) : (
                            <ChevronRight
                              aria-hidden
                              className={cn(
                                'size-3.5 shrink-0',
                                isActive ? 'text-gold' : 'text-text-3 opacity-0 group-hover:opacity-100',
                              )}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
