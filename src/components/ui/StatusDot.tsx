import { cn } from '@/lib/cn'

/**
 * §8.4 health bands. Semantic hue only — never gold, which §4.1 reserves for
 * actions and progress. "Excellent" is `--success` distinguished by a filled
 * ring and a check, not by a different hue.
 */
export type StatusTone = 'danger' | 'warn' | 'success' | 'info' | 'neutral'

const TONE_CLASS: Record<StatusTone, string> = {
  danger: 'bg-danger',
  warn: 'bg-warn',
  success: 'bg-success',
  info: 'bg-info',
  neutral: 'bg-text-3',
}

export function StatusDot({
  tone,
  ringed = false,
  label,
  className,
}: {
  tone: StatusTone
  /** The "Excellent" band's second signal, so the top two bands are not hue-only. */
  ringed?: boolean
  /** Screen-reader text, since colour alone must never carry the meaning. */
  label?: string
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex size-2.5 shrink-0', className)}>
      <span className={cn('rounded-pill size-2.5', TONE_CLASS[tone])} />
      {ringed ? (
        <span
          className={cn('rounded-pill absolute -inset-1 border', {
            'border-danger': tone === 'danger',
            'border-warn': tone === 'warn',
            'border-success': tone === 'success',
            'border-info': tone === 'info',
            'border-text-3': tone === 'neutral',
          })}
        />
      ) : null}
      {label === undefined ? null : <span className="sr-only">{label}</span>}
    </span>
  )
}
