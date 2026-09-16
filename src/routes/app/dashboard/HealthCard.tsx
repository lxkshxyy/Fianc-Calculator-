import type { CSSProperties } from 'react'

import { Card } from '@/components/ui/Card'
import { useReveal } from '@/lib/useReveal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { StatusDot } from '@/components/ui/StatusDot'
import type { Derived } from '@/domain/derive'
import { HEALTH_BAND_EMOJI, HEALTH_BAND_LABEL, HEALTH_BAND_TONE } from '@/domain/metrics'

/*
 * §4.1b — one hue per component, cycled by position. Five identical gold bars
 * told you five numbers and nothing about which was which; colour makes each
 * row findable at a glance without reading the label.
 */
const METER_HUES = [
  'var(--cat-mint)',
  'var(--cat-sky)',
  'var(--cat-rose)',
  'var(--cat-violet)',
  'var(--cat-teal)',
]

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
  /* Above the early return — a hook cannot sit behind a condition. */
  const reveal = useReveal<HTMLUListElement>()

  if (health.score === null || health.band === null) {
    return (
      <Card className="h-full">
        <SectionLabel>Financial health</SectionLabel>
        <p className="text-text mt-3 text-lg font-semibold">Not enough yet</p>
        <p className="text-text-2 mt-1 text-sm">
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
        <StatusDot
          tone={tone}
          ringed={health.band === 'excellent'}
          label={`Score ${String(health.score)} of 100`}
        />
        <p className="text-text text-lg font-semibold">
          <span aria-hidden className="mr-1.5">
            {HEALTH_BAND_EMOJI[health.band]}
          </span>
          {HEALTH_BAND_LABEL[health.band]}
        </p>
        <span className="text-caption text-text-2 ml-auto tabular-nums">{health.score}/100</span>
      </div>

      {health.weakest === null ? null : (
        <p className="text-text-2 mt-2 text-sm">{health.weakest.hint}</p>
      )}

      <ul ref={reveal} className="mt-4 space-y-2">
        {health.components
          .filter((component) => component.available)
          .map((component, index) => {
            const percent = Math.round((component.points / component.max) * 100)
            return (
              <li
                key={component.id}
                className="fade-rise flex items-center gap-3"
                style={{ animationDelay: `${String(index * 70)}ms` }}
              >
                <span className="text-caption text-text-2 w-28 shrink-0">{component.label}</span>
                <span className="meter-track h-2 flex-1 overflow-hidden">
                  <span
                    className="meter-fill block"
                    style={
                      {
                        '--meter-to': `${String(percent)}%`,
                        '--meter-hue': METER_HUES[index % METER_HUES.length],
                        /* Staggered, so the five read as a sequence rather than a flash. */
                        animationDelay: `${String(index * 70)}ms`,
                      } as CSSProperties
                    }
                  />
                </span>
              </li>
            )
          })}
      </ul>

      {missing.length === 0 ? null : (
        <p className="text-caption text-text-3 mt-3">
          Not scored yet: {missing.map((component) => component.label).join(', ')}.
        </p>
      )}
    </Card>
  )
}
