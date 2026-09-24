import { ChevronRight, ExternalLink } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Wordmark } from '@/components/ui/Wordmark'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProfile } from '@/data/store/data'
import { useT } from '@/i18n'
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
  const t = useT()
  const profile = useProfile()
  const displayName = profile?.displayName ?? 'You'
  const tier = profile?.tier ?? 'silver'

  return (
    <aside className="border-border bg-bg-elevated fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r lg:flex">
      {/* §5.1 — "Top: wordmark + theme toggle." One row now: the toggle is a
          single 44px button, so both fit across 260px. */}
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
        <Wordmark className="text-lead leading-tight" />
        <ThemeToggle />
      </div>

      <Link
        to={APP_BASE + '/profile'}
        aria-label={t('header.openProfile')}
        className="rounded-tile bg-surface-2 hover:bg-surface focus-visible:outline-text-2 mx-4 mb-4 flex items-center gap-3 p-3 transition-colors focus-visible:outline-2"
      >
        <Avatar avatar={profile?.avatar} name={displayName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-meta text-text truncate font-medium">{displayName}</p>
          <TierBadge tier={tier} size="sm" className="mt-1" />
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-5">
            <SectionLabel className="px-2 pb-2">{t(group.labelKey)}</SectionLabel>
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
                          'group rounded-tile text-meta relative flex min-h-11 items-center gap-2.5 pr-2 pl-3',
                          'transition-colors duration-150',
                          isActive && item.external !== true
                            ? 'bg-surface text-gold font-medium'
                            : 'text-text-2 hover:bg-surface-2 hover:text-text',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && item.external !== true ? (
                            <span
                              aria-hidden
                              className="rounded-pill bg-gold absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2"
                            />
                          ) : null}
                          <item.icon aria-hidden className="size-4 shrink-0" />
                          <span className="flex-1 truncate">{t(item.labelKey)}</span>
                          {item.external === true ? (
                            <ExternalLink
                              aria-label={t('header.leavesApp')}
                              className="text-text-3 size-3.5 shrink-0"
                            />
                          ) : (
                            <ChevronRight
                              aria-hidden
                              className={cn(
                                'size-3.5 shrink-0',
                                isActive
                                  ? 'text-gold'
                                  : 'text-text-3 opacity-0 group-hover:opacity-100',
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
