import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProfile } from '@/data/store/data'
import { moduleTier } from '@/domain/journey'
import { APP_BASE, NAV_GROUPS } from '@/app/nav/navigation'
import { ModuleScreen } from './ModuleScreen'

/**
 * §5.2 — the destination for the Money, Wealth and Growth tabs.
 *
 * A group header is a label, not a place. On desktop the sidebar shows every
 * item at once, but a bottom tab has to lead *somewhere*, and a tab that opens a
 * sheet is a dead end you cannot deep-link or go back from. This is a real route
 * listing the group's modules.
 */
export function GroupIndex() {
  const { pathname } = useLocation()
  const tier = useProfile()?.tier ?? 'silver'
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const group = NAV_GROUPS.find((entry) => entry.indexPath === segment)

  if (group === undefined) {
    return (
      <EmptyState
        icon={ChevronRight}
        title="Nothing here"
        description="This section does not exist. Use the menu to get back."
      />
    )
  }

  return (
    <ModuleScreen
      title={group.label}
      subtitle={`Everything under ${group.label.toLowerCase()}.`}
      icon={group.icon}
    >
      <ul className="divide-border rounded-card border-border bg-surface divide-y overflow-hidden border">
        {group.items.map((item) => {
          const required = moduleTier(item.path)
          const locked = required === 'diamond' && tier !== 'diamond'
          const to = item.external === true ? item.path : `${APP_BASE}/${item.path}`
          return (
            <li key={item.path}>
              <Link
                to={to}
                className="hover:bg-surface-2 focus-visible:outline-text-2 flex items-center gap-3 px-4 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <item.icon aria-hidden className="text-text-3 size-4 shrink-0" />
                <span className="text-text flex-1 text-sm">{item.label}</span>
                {locked ? <TierBadge tier="diamond" /> : null}
                <ChevronRight aria-hidden className="text-text-3 size-4 shrink-0" />
              </Link>
            </li>
          )
        })}
      </ul>
    </ModuleScreen>
  )
}
