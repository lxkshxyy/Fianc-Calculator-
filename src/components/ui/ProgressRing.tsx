import type { CSSProperties } from 'react'

import { cn } from '@/lib/cn'

/**
 * §4.6 — one of only three things that move: the arc fills from 0 to value once
 * on mount over 400ms ease-out.
 *
 * The fill is a CSS keyframe rather than React state. State would mean setting
 * it synchronously in an effect to trigger the transition, which cascades a
 * render for a purely visual change; a keyframe animates from `--ring-from` to
 * `--ring-to` with no re-render at all, and the global prefers-reduced-motion
 * block in index.css collapses its duration for free (§4.6).
 *
 * §4 — progress is one of the five places gold is allowed.
 */
export function ProgressRing({
  value,
  label,
  caption,
  size = 96,
  strokeWidth = 8,
  className,
}: {
  /** 0–1, or null when the metric is unavailable (§8.4). Out-of-range values are clamped. */
  value: number | null
  label: string
  caption?: string
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const safeValue =
    value === null || !Number.isFinite(value) ? null : Math.min(Math.max(value, 0), 1)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (safeValue ?? 0))
  const percentLabel = safeValue === null ? '—' : Math.round(safeValue * 100) + '%'
  const centre = size / 2

  const arcStyle = {
    strokeDashoffset: offset,
    '--ring-from': circumference,
    '--ring-to': offset,
  } as CSSProperties

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={'0 0 ' + size + ' ' + size}
          role="img"
          aria-label={label + ': ' + (safeValue === null ? 'not available' : percentLabel)}
        >
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={strokeWidth}
          />
          {safeValue === null ? null : (
            <circle
              className="ring-fill"
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              transform={'rotate(-90 ' + centre + ' ' + centre + ')'}
              style={arcStyle}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="tabular text-title font-semibold text-text">{percentLabel}</span>
        </span>
      </div>
      <div className="text-center">
        <p className="text-meta font-medium text-text">{label}</p>
        {caption === undefined ? null : <p className="text-caption text-text-2">{caption}</p>}
      </div>
    </div>
  )
}
