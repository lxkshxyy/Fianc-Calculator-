import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { StatusDot } from '@/components/ui/StatusDot'
import type { Derived } from '@/domain/derive'
import { HEALTH_BAND_LABEL, HEALTH_BAND_TONE } from '@/domain/metrics'

/**
 * §9.1 item 5, left half.
 *
 * The score is `null` — not zero — when nothing has been entered yet, because
 * telling a brand-new user their finances "Need Work" before they have typed
 * anything is a judgement the data does not support. The component list below
 * says which inputs are still missing, so a low score is actionable rather than
 * just discouraging.
 */
export function HealthCard({ derived }: { derived: Derived }) {
  const { health } = derived

  if (health.score === null || health.band === null) {
    return (
      <Card className="h-full">
        <SectionLabel>Financial health</SectionLabel>
        <p className="mt-3 font-semibold text-lg text-text">Not enough yet</p>
        <p className="mt-1 text-sm text-text-2">
          Add your income, spending and what you own, and this starts working.
        </p>
      </Card>
    )
  }

  const tone = HEALTH_BAND_TONE[health.band]
  const missing = health.components.filter((component) => !component.available)

  return (
    <Card className="h-full">
      <SectionLabel>Financial health</SectionLabel>

      <div className="mt-3 flex items-center gap-2.5">
        <StatusDot tone={tone} ringed={health.band === 'excellent'} label={`Score ${String(health.score)} of 100`} />
        <p className="font-semibold text-lg text-text">{HEALTH_BAND_LABEL[health.band]}</p>
        <span className="ml-auto text-caption text-text-2 tabular-nums">{health.score}/100</span>
      </div>

      {health.weakest === null ? null : (
        <p className="mt-2 text-sm text-text-2">{health.weakest.hint}</p>
      )}

      <ul className="mt-4 space-y-2">
        {health.components
          .filter((component) => component.available)
          .map((component) => (
            <li key={component.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-caption text-text-2">{component.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-gold"
                  style={{ width: `${String(Math.round((component.points / component.max) * 100))}%` }}
                />
              </span>
            </li>
          ))}
      </ul>

      {missing.length === 0 ? null : (
        <p className="mt-3 text-caption text-text-3">
          Not scored yet: {missing.map((component) => component.label).join(', ')}.
        </p>
      )}
    </Card>
  )
}
