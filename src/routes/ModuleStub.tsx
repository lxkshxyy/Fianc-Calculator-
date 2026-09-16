import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { APP_BASE, NAV_GROUPS, routeMetaFor } from '@/app/nav/navigation'
import { useT } from '@/i18n'
import { Link } from 'react-router-dom'

/**
 * The Phase 2 placeholder for every private route.
 *
 * One shared module rather than 24 throwaway files: each route still resolves to
 * its own path and is still lazily loaded, and Phases 4–9 replace routes one at a
 * time with real screens. Nothing here has to be deleted later, which keeps §2.2's
 * "do not delete a previous phase's files" out of the way.
 *
 * A group index (§5.2's Money / Wealth / Growth tab destinations) lists its
 * group's modules; every other route shows which phase builds it.
 */
export function ModuleStub() {
  const t = useT()
  const location = useLocation()
  const segment = location.pathname.replace(APP_BASE, '').split('/').filter(Boolean)[0] ?? ''
  const meta = routeMetaFor(location.pathname, t)
  const group = NAV_GROUPS.find((candidate) => candidate.indexPath === segment)

  if (group) {
    return (
      <div className="space-y-4">
        <SectionLabel>{t(group.labelKey)}</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.items.map((item) => (
            <Link
              key={item.path}
              to={item.external === true ? item.path : APP_BASE + '/' + item.path}
              className="rounded-card border-border bg-surface hover:border-border-strong hover:bg-surface-2 border p-4 transition-colors duration-150 sm:p-5"
            >
              <span className="rounded-tile bg-surface-2 text-text-2 flex size-9 items-center justify-center">
                <item.icon aria-hidden className="size-4" />
              </span>
              <p className="text-body text-text mt-3 font-semibold">{t(item.labelKey)}</p>
              <p className="text-caption text-text-2 mt-1">Phase {item.phase}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <EmptyState
        icon={Construction}
        title={(meta?.title ?? 'Screen') + ' is not built yet'}
        description={
          meta === null
            ? 'This route resolves, but no screen is specified for it yet.'
            : meta.subtitle + '. The shell, routing and guard around it are working.'
        }
      />
    </Card>
  )
}
