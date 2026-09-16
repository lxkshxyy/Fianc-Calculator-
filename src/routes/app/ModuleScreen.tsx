import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { LockedOverlay } from '@/components/ui/LockedOverlay'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useEntitlement } from '@/data/store/entitlement'

/**
 * §9.4 — the shared module skeleton every screen follows:
 *
 *   header → summary row → primary visual → list → detail
 *
 * It also owns §9.5's gate, so a Diamond module cannot ship without one: a
 * screen that forgets `moduleId` gets `silver` and is simply open, but a screen
 * that declares one is gated here rather than in its own body.
 */
export function ModuleScreen({
  title,
  subtitle,
  icon: Icon,
  moduleId,
  unlockLine,
  action,
  summary,
  children,
}: {
  title: string
  subtitle: string
  icon?: LucideIcon
  /** Matches a module id in the journey ladder; omit for always-open screens. */
  moduleId?: string
  /** §9.5 — names the one thing being unlocked, never the whole plan. */
  unlockLine?: string
  action?: ReactNode
  summary?: ReactNode
  children: ReactNode
}) {
  const entitlement = useEntitlement(moduleId ?? '')

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon === undefined ? null : (
            <span className="rounded-tile bg-surface-2 mt-1 p-2">
              <Icon aria-hidden className="text-gold size-5" />
            </span>
          )}
          <div>
            <h1 className="text-page text-text font-semibold tracking-tight text-balance">
              {title}
            </h1>
            <p className="text-text-2 mt-1 max-w-prose text-sm">{subtitle}</p>
          </div>
        </div>
        {action}
      </header>

      {summary === undefined ? null : <div>{summary}</div>}

      {entitlement.allowed ? (
        children
      ) : (
        <LockedOverlay unlocks={unlockLine ?? title.toLowerCase()}>{children}</LockedOverlay>
      )}
    </div>
  )
}

/** A labelled block inside a module screen. */
export function ModuleSection({
  label,
  action,
  children,
}: {
  label: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={label}>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>{label}</SectionLabel>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
