import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useData, useDerived, useProfile } from '@/data/store/data'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import { HealthCard } from './dashboard/HealthCard'
import { JourneyRail } from './dashboard/JourneyRail'
import { KeyMetrics } from './dashboard/KeyMetrics'
import { NetWorthCard } from './dashboard/NetWorthCard'
import { ProgressCard } from './dashboard/ProgressCard'
import { QuickAddBar } from './dashboard/QuickAddBar'

/**
 * §9.1 — the dashboard. Six blocks, in order, on real seeded numbers.
 *
 * Edit Dashboard reorders and hides sections and persists to the Profile record.
 * It uses move and hide *buttons* rather than drag-and-drop: §2.1.10 requires
 * every interactive element to be reachable by keyboard, and a pointer-only drag
 * handle is the most common way a layout editor fails that.
 */

const SECTION_IDS = ['netWorth', 'journey', 'health', 'metrics'] as const
type SectionId = (typeof SECTION_IDS)[number]

const SECTION_LABEL: Record<SectionId, TranslationKey> = {
  netWorth: 'dashboard.netWorth',
  journey: 'dashboard.journey',
  health: 'dashboard.health',
  metrics: 'dashboard.metrics',
}

function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value)
}

export function Dashboard() {
  const t = useT()
  const derived = useDerived()
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  const [editing, setEditing] = useState(false)

  const order = useMemo<SectionId[]>(() => {
    const stored = profile?.dashboardLayout ?? null
    if (stored === null) return [...SECTION_IDS]
    const valid = stored.filter(isSectionId)
    /* Any section added since the layout was saved appends rather than vanishing. */
    const missing = SECTION_IDS.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  }, [profile?.dashboardLayout])

  const hidden = useMemo<Set<string>>(
    () => new Set(profile?.hiddenDashboardSections ?? []),
    [profile?.hiddenDashboardSections],
  )

  if (derived === null || profile === null) return null

  function move(id: SectionId, direction: -1 | 1): void {
    const index = order.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return
    const next = [...order]
    const [moved] = next.splice(index, 1)
    if (moved === undefined) return
    next.splice(target, 0, moved)
    void saveProfile({ dashboardLayout: next })
  }

  function toggle(id: SectionId): void {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    void saveProfile({ hiddenDashboardSections: [...next] })
  }

  function reset(): void {
    void saveProfile({ dashboardLayout: null, hiddenDashboardSections: [] })
  }

  const sections: Record<SectionId, React.ReactNode> = {
    netWorth: <NetWorthCard derived={derived} />,
    journey: <JourneyRail derived={derived} tier={profile.tier} />,
    health: (
      <div className="gap-grid grid lg:grid-cols-2">
        <HealthCard derived={derived} />
        <ProgressCard derived={derived} />
      </div>
    ),
    metrics: (
      <section aria-label={t('dashboard.metrics')}>
        <SectionLabel>{t('dashboard.metrics')}</SectionLabel>
        <div className="mt-3">
          <KeyMetrics derived={derived} />
        </div>
      </section>
    ),
  }

  return (
    <div className="space-y-section pb-4">
      {/* The greeting lives in the sticky header now — see routeMetaFor. What is
          left here is the one control this screen owns. */}
      <div className="flex justify-end">
        <AppButton
          variant={editing ? 'primary' : 'ghost'}
          onClick={() => {
            setEditing((value) => !value)
          }}
        >
          {editing ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Pencil aria-hidden className="size-4" />
          )}
          {editing ? t('dashboard.editDone') : t('dashboard.edit')}
        </AppButton>
      </div>

      <QuickAddBar />

      {editing ? (
        <div className="rounded-card border-gold-dim bg-surface border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>{t('dashboard.arrange')}</SectionLabel>
            <button
              type="button"
              onClick={reset}
              className="rounded-tile text-caption text-text-2 hover:text-text underline underline-offset-2"
            >
              {t('dashboard.resetLayout')}
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {order.map((id, index) => (
              <li key={id} className="rounded-tile bg-surface-2 flex items-center gap-2 px-3 py-2">
                <span className="text-text flex-1 text-sm">{t(SECTION_LABEL[id])}</span>
                <button
                  type="button"
                  onClick={() => {
                    move(id, -1)
                  }}
                  disabled={index === 0}
                  aria-label={t('dashboard.moveUpOf', { section: t(SECTION_LABEL[id]) })}
                  className="rounded-tile text-text-2 hover:text-text p-1.5 disabled:opacity-40"
                >
                  <ChevronUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    move(id, 1)
                  }}
                  disabled={index === order.length - 1}
                  aria-label={t('dashboard.moveDownOf', { section: t(SECTION_LABEL[id]) })}
                  className="rounded-tile text-text-2 hover:text-text p-1.5 disabled:opacity-40"
                >
                  <ChevronDown aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggle(id)
                  }}
                  aria-pressed={hidden.has(id)}
                  aria-label={t(hidden.has(id) ? 'dashboard.showOf' : 'dashboard.hideOf', {
                    section: t(SECTION_LABEL[id]),
                  })}
                  className="rounded-tile text-text-2 hover:text-text p-1.5"
                >
                  {hidden.has(id) ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order
        .filter((id) => !hidden.has(id))
        .map((id) => (
          <div key={id}>{sections[id]}</div>
        ))}
    </div>
  )
}
