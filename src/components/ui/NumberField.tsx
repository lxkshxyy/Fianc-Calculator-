import { useId, useState } from 'react'

import { cn } from '@/lib/cn'
import { formatFull, parseAmount } from '@/lib/money'

/**
 * §10.9 — `inputMode="decimal"` so the numeric keypad opens on a phone.
 * §4.5 — what the user types is parsed by `money.ts`, never by a local regex.
 *
 * An unparseable entry reports itself and yields `null`; it never silently
 * becomes 0. A silent zero in a finance app writes a real transaction of the
 * wrong amount.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  placeholder = `e.g. 15k, 1.5L, ${formatFull(15_000)}`,
  hint,
  disabled = false,
  className,
}: {
  label: string
  /** The raw text the user typed — the field is uncontrolled in rupees, controlled in text. */
  value: string
  onValueChange: (raw: string, parsed: number | null) => void
  placeholder?: string
  hint?: string
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const parsed = parseAmount(value)
  const showError = touched && value.trim() !== '' && parsed === null

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-meta font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        aria-invalid={showError}
        aria-describedby={id + '-hint'}
        onBlur={() => {
          setTouched(true)
        }}
        onChange={(event) => {
          const next = event.target.value
          onValueChange(next, parseAmount(next))
        }}
        className={cn(
          'tabular min-h-11 w-full rounded-button border bg-surface-2 px-3 text-body text-text',
          'placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-60',
          'transition-colors duration-150',
          showError ? 'border-danger' : 'border-border hover:border-border-strong',
        )}
      />
      <p
        id={id + '-hint'}
        className={cn('min-h-[18px] text-caption', showError ? 'text-danger' : 'text-text-2')}
      >
        {showError
          ? 'Not a recognisable amount. Try 15k, 1.5L or 15,000.'
          : parsed === null
            ? (hint ?? '')
            : formatFull(parsed)}
      </p>
    </div>
  )
}
