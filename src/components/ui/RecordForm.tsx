import { useState, type FormEvent } from 'react'
import type { ZodType } from 'zod'

import { AppButton } from '@/components/ui/AppButton'
import { NumberField } from '@/components/ui/NumberField'
import { TextField } from '@/components/ui/TextField'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import { MAX_AMOUNT, formatCompact, isWithinAmountLimit, parseAmount } from '@/lib/money'

/**
 * One form for every kind of record.
 *
 * Eight bespoke add-forms is eight places to get validation subtly wrong, and
 * eight places to update when a schema changes. This takes a field list and the
 * record's own Zod schema, so the form cannot write something the repository
 * would refuse — the schema is the single authority, exactly as it is for data
 * read back from storage (§8.2).
 *
 * Every field reports its own error, and nothing is written until all of them
 * pass. A money field that cannot be parsed yields `null` rather than 0: a
 * silent zero in a finance app is a real amount, entered wrongly (§4.5).
 *
 * §4.5b's entry limit is enforced here rather than on each record's schema, and
 * deliberately so: the schema also parses everything read back from storage, and
 * a bound there would silently drop a record saved before the limit existed —
 * data loss dressed up as validation. The limit belongs on the way in.
 */

/**
 * `label` is a translation key, not the text.
 *
 * The specs are module-level constants in `addForms.ts`, evaluated once at
 * import time — long before anything knows which language the user picked. A
 * string baked in there would be frozen in whatever language the module was
 * first loaded with. A key is resolved at render, so the form re-labels itself
 * the moment the language changes.
 */
export type FieldSpec =
  | { kind: 'text'; name: string; label: TranslationKey; hint?: string; placeholder?: string }
  | { kind: 'money'; name: string; label: TranslationKey; hint?: string }
  | { kind: 'number'; name: string; label: TranslationKey; hint?: string; placeholder?: string }
  | { kind: 'date'; name: string; label: TranslationKey; hint?: string }
  | {
      kind: 'select'
      name: string
      label: TranslationKey
      hint?: string
      options: readonly SelectOption[]
    }

export type SelectOption = { value: string; label: string }

export type FieldValues = Record<string, string>

export function RecordForm({
  fields,
  schema,
  initial = {},
  /** Values merged in after the fields, for things the form does not ask about. */
  constants = {},
  submitLabel,
  onSubmit,
  onCancel,
}: {
  fields: readonly FieldSpec[]
  /** The record's Draft schema. The form's output must satisfy it. */
  schema: ZodType
  initial?: FieldValues
  constants?: Record<string, unknown>
  submitLabel: string
  onSubmit: (draft: Record<string, unknown>) => Promise<void> | void
  onCancel: () => void
}) {
  const t = useT()
  const [values, setValues] = useState<FieldValues>(() => {
    const seed: FieldValues = {}
    for (const field of fields) {
      seed[field.name] =
        initial[field.name] ?? (field.kind === 'select' ? (field.options[0]?.value ?? '') : '')
    }
    return seed
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  function set(name: string, value: string): void {
    setValues((current) => ({ ...current, [name]: value }))
  }

  /** Text in, typed value out — the shape the schema expects. */
  function coerce(field: FieldSpec, raw: string): unknown {
    if (field.kind === 'money') return parseAmount(raw)
    if (field.kind === 'number') {
      const trimmed = raw.trim()
      if (trimmed === '') return null
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : null
    }
    return raw.trim()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const draft: Record<string, unknown> = { ...constants }
    const local: Record<string, string> = {}
    const blank = new Set<string>()

    for (const field of fields) {
      const raw = values[field.name] ?? ''
      if (raw.trim() === '') blank.add(field.name)

      const value = coerce(field, raw)
      if ((field.kind === 'money' || field.kind === 'number') && value === null) {
        local[field.name] = raw.trim() === '' ? '' : t('form.enterNumber')
        continue
      }
      if (field.kind === 'money' && typeof value === 'number' && !isWithinAmountLimit(value)) {
        local[field.name] = t('form.amountTooLarge', { max: formatCompact(MAX_AMOUNT) })
        continue
      }
      draft[field.name] = value
    }

    const parsed = schema.safeParse(draft)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && local[key] === undefined) local[key] = issue.message
      }
    }

    /*
     * A field left empty is told so in those words.
     *
     * Every schema message below this point was written for a developer reading
     * a parse failure — "Too small: expected string to have >=1 characters" on a
     * blank name, "Pick a date." on a date input that shows nothing at all. The
     * person is not being told their entry is wrong; they are being told they
     * missed a box. Say that, and name the box.
     */
    for (const field of fields) {
      if (blank.has(field.name) && local[field.name] !== undefined) {
        local[field.name] = t('form.isNeeded', { label: t(field.label) })
      }
    }

    if (Object.keys(local).length > 0) {
      setErrors(local)
      return
    }

    setErrors({})
    setBusy(true)
    /*
     * The schema's output, not the raw draft. A schema may transform on the way
     * through — an empty nominee becoming null, say — and submitting the input
     * would quietly throw that away and write the value the schema just rejected
     * in spirit.
     */
    await onSubmit(parsed.success ? (parsed.data as Record<string, unknown>) : draft)
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      {fields.map((field) => {
        const value = values[field.name] ?? ''
        const error = errors[field.name]

        if (field.kind === 'money') {
          return (
            <NumberField
              key={field.name}
              label={t(field.label)}
              value={value}
              hint={field.hint}
              error={error}
              onValueChange={(raw) => {
                set(field.name, raw)
              }}
            />
          )
        }

        if (field.kind === 'select') {
          return (
            <SelectField
              key={field.name}
              label={t(field.label)}
              value={value}
              options={field.options}
              hint={field.hint}
              error={error}
              onChange={(next) => {
                set(field.name, next)
              }}
            />
          )
        }

        return (
          <TextField
            key={field.name}
            label={t(field.label)}
            type={field.kind === 'date' ? 'date' : 'text'}
            inputMode={field.kind === 'number' ? 'numeric' : undefined}
            value={value}
            placeholder={field.kind === 'date' ? undefined : field.placeholder}
            hint={field.hint}
            error={error}
            onChange={(event) => {
              set(field.name, event.target.value)
            }}
          />
        )
      })}

      <div className="mt-2 flex gap-2">
        <AppButton type="submit" variant="primary" disabled={busy} className="flex-1">
          {busy ? t('action.saving') : submitLabel}
        </AppButton>
        <AppButton type="button" variant="ghost" onClick={onCancel}>
          {t('action.cancel')}
        </AppButton>
      </div>
    </form>
  )
}

/** A native select — it gets the platform's own picker on a phone, which no custom menu beats. */
export function SelectField({
  label,
  value,
  options,
  hint,
  error,
  onChange,
}: {
  label: string
  value: string
  options: readonly SelectOption[]
  hint?: string
  error?: string
  onChange: (value: string) => void
}) {
  const invalid = error !== undefined && error !== ''

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-meta text-text font-medium">
        {label}
        <select
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className={
            'rounded-button bg-surface-2 text-body text-text mt-1.5 min-h-11 w-full border px-3 ' +
            (invalid ? 'border-danger' : 'border-border hover:border-border-strong')
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className={'text-caption min-h-[18px] ' + (invalid ? 'text-danger' : 'text-text-2')}>
        {invalid ? error : (hint ?? '')}
      </p>
    </div>
  )
}
