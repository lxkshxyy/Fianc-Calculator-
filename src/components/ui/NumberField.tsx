import { useId, useState } from 'react'

import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
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
  error,
  disabled = false,
  className,
}: {
  label: string
  /** The raw text the user typed — the field is uncontrolled in rupees, controlled in text. */
  value: string
  onValueChange: (raw: string, parsed: number | null) => void
  placeholder?: string
  hint?: string
  /**
   * A message from whoever owns the form, shown whatever the field's own state.
   *
   * Without this the field could only complain about text it had itself failed
   * to parse, and only after a blur — so "Enter a number" on an empty field that
   * was never touched had nowhere to appear, and a submit blocked by an empty
   * amount looked like a button that simply did nothing.
   */
  error?: string
  disabled?: boolean
  className?: string
}) {
  const t = useT()
  const id = useId()
  const [touched, setTouched] = useState(false)
  const parsed = parseAmount(value)
  const unreadable = touched && value.trim() !== '' && parsed === null
  const showError = unreadable || (error !== undefined && error !== '')

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-meta text-text font-medium">
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
          'tabular rounded-button bg-surface-2 text-body text-text min-h-11 w-full border px-3',
          'placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-60',
          'transition-colors duration-150',
          showError ? 'border-danger' : 'border-border hover:border-border-strong',
        )}
      />
      <p
        id={id + '-hint'}
        className={cn('text-caption min-h-[18px]', showError ? 'text-danger' : 'text-text-2')}
      >
        {unreadable
          ? t('form.unreadableAmount')
          : showError
            ? error
            : parsed === null
              ? (hint ?? '')
              : formatFull(parsed)}
      </p>
    </div>
  )
}
