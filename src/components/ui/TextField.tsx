import { useId, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * A labelled text input, matching NumberField's shape so forms look like one
 * family.
 *
 * The error slot always occupies a line, so a message appearing does not shove
 * the rest of the form down the page — the field below it stays where the thumb
 * expected it to be.
 */
export function TextField({
  label,
  error,
  hint,
  className,
  ...input
}: {
  label: string
  /** Shown in place of the hint, and wired to aria-invalid / aria-describedby. */
  error?: string
  hint?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const id = useId()
  const describedBy = `${id}-hint`
  const invalid = error !== undefined && error !== ''

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-meta text-text font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          'rounded-button bg-surface-2 text-body text-text min-h-11 w-full border px-3',
          'placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-60',
          'transition-colors duration-150',
          invalid ? 'border-danger' : 'border-border hover:border-border-strong',
        )}
        {...input}
      />
      <p
        id={describedBy}
        className={cn('text-caption min-h-[18px]', invalid ? 'text-danger' : 'text-text-2')}
      >
        {invalid ? error : (hint ?? '')}
      </p>
    </div>
  )
}
