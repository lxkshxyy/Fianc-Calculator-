import { AlertCircle, Check, ChevronLeft, ChevronRight, Paperclip, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { newId, nowMs } from '@/data/schema'
import { repo } from '@/data/repo'
import { PublicShell } from './PublicShell'

/**
 * §9.3 — the seven-step Insurance Review request, available without an account.
 *
 * Three things here are the point, not decoration:
 *
 *   1. **Consent is part of step 1.** This form takes a name, email, phone number
 *      and uploaded policy documents from someone who has no account to manage
 *      them from. The checkbox starts unticked, the purpose and retention are
 *      stated in one line, and the Privacy page is one tap away.
 *   2. **The draft survives a refresh**, and because it does, there is a Discard
 *      draft control — Settings' data controls sit behind the auth guard and are
 *      unreachable from here.
 *   3. **Validation is per step**, not at submit. Finding out on step 7 that
 *      step 1 was wrong is how forms get abandoned.
 */

const DRAFT_KEY = 'wrc.request.insurance-review'

const NEEDS = [
  'New term insurance',
  'Additional term insurance',
  'Health insurance',
  'Family health insurance',
  'Critical illness cover',
  'Accident insurance',
  'Review an existing policy',
  'Reduce my premium',
  'Help with a claim',
  'Something else',
]

const REASONS = [
  'I want a new policy',
  'I want additional cover',
  'My income has increased',
  'I got married',
  'We had a child',
  'I bought a home',
  'I want to reduce my premium',
  'I want my existing policy reviewed',
  'My advisor asked me to fill this',
  'Something else',
]

const TERM_ANSWERS = ['Yes', 'No', 'Not sure']
const HEALTH_ANSWERS = ['Yes', 'No', 'Family floater', 'Individual', 'Not sure']
const CONTACT_METHODS = ['WhatsApp', 'Phone', 'Email']
const CONTACT_TIMES = ['Morning', 'Afternoon', 'Evening']

const DOCUMENT_SLOTS = [
  'Term insurance policy',
  'Health insurance policy',
  'Premium receipt',
  'Other document',
]

/* §9.3's stated limits, enforced client-side with a readable message. */
const MAX_FILES = 8
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 18 * 1024 * 1024

type Attachment = { id: string; slot: string; name: string; bytes: number }

type Draft = {
  fullName: string
  email: string
  whatsapp: string
  city: string
  consent: boolean
  needs: string[]
  hasTerm: string
  hasHealth: string
  reason: string
  method: string
  time: string
  comments: string
  attachments: Attachment[]
}

const EMPTY: Draft = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  consent: false,
  needs: [],
  hasTerm: '',
  hasHealth: '',
  reason: '',
  method: '',
  time: '',
  comments: '',
  attachments: [],
}

function loadDraft(): Draft {
  try {
    const raw = globalThis.localStorage.getItem(DRAFT_KEY)
    if (raw === null) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY
    /* Spread over EMPTY so a stored draft missing a newer field still loads. */
    return { ...EMPTY, ...(parsed as Partial<Draft>) }
  } catch {
    return EMPTY
  }
}

function saveDraft(draft: Draft): void {
  try {
    globalThis.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* Private windows and blocked site data refuse writes; the form still works. */
  }
}

function clearDraft(): void {
  try {
    globalThis.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* Nothing to do — the value was never stored. */
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/* Ten digits, optionally with a +91 and separators the user might type. */
const PHONE_PATTERN = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/

/** Per-step validation. Returns the messages blocking this step, in field order. */
function stepErrors(step: number, draft: Draft): string[] {
  const errors: string[] = []
  if (step === 0) {
    if (draft.fullName.trim().length === 0) errors.push('Enter your name.')
    if (!EMAIL_PATTERN.test(draft.email.trim())) errors.push('Enter a valid email address.')
    if (!PHONE_PATTERN.test(draft.whatsapp.replace(/\s/g, ''))) {
      errors.push('Enter a 10-digit Indian mobile number.')
    }
    if (!draft.consent) errors.push('Tick the consent box so the team may contact you.')
  }
  if (step === 1 && draft.needs.length === 0) errors.push('Choose at least one.')
  if (step === 2) {
    if (draft.hasTerm === '') errors.push('Answer the term insurance question.')
    if (draft.hasHealth === '') errors.push('Answer the health insurance question.')
  }
  if (step === 3 && draft.reason === '') errors.push('Choose a reason.')
  if (step === 4) {
    if (draft.method === '') errors.push('Choose how you would like to be contacted.')
    if (draft.time === '') errors.push('Choose a time of day.')
  }
  return errors
}

const STEP_TITLES = [
  'Contact information',
  'What do you need help with?',
  'Existing insurance',
  'Why are you requesting this review?',
  'Preferred contact',
  'Anything else',
  'Documents (optional)',
]

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? 'bg-gold text-on-gold rounded-full px-3 py-2 text-sm font-medium'
          : 'border-border text-text-2 hover:border-border-strong rounded-full border px-3 py-2 text-sm'
      }
    >
      {label}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  inputMode,
  autoComplete,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  autoComplete?: string
  placeholder?: string
}) {
  const id = `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <label htmlFor={id} className="block">
      <span className="text-caption text-text-2">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="rounded-tile border-border bg-surface text-text placeholder:text-text-3 focus-visible:outline-text-2 mt-1.5 h-11 w-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      />
    </label>
  )
}

export function InsuranceReviewForm() {
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  const errors = stepErrors(step, draft)
  const isLast = step === STEP_TITLES.length - 1

  function patch(changes: Partial<Draft>): void {
    setDraft((previous) => ({ ...previous, ...changes }))
  }

  function next(): void {
    if (errors.length > 0) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setStep((value) => Math.min(STEP_TITLES.length - 1, value + 1))
  }

  function addFiles(slot: string, list: FileList | null): void {
    if (list === null || list.length === 0) return
    const incoming = [...list]
    const currentTotal = draft.attachments.reduce((sum, file) => sum + file.bytes, 0)

    if (draft.attachments.length + incoming.length > MAX_FILES) {
      setUploadError(`You can attach up to ${String(MAX_FILES)} files.`)
      return
    }
    const oversized = incoming.find((file) => file.size > MAX_FILE_BYTES)
    if (oversized !== undefined) {
      setUploadError(`"${oversized.name}" is over the 10 MB limit for a single file.`)
      return
    }
    const newTotal = currentTotal + incoming.reduce((sum, file) => sum + file.size, 0)
    if (newTotal > MAX_TOTAL_BYTES) {
      setUploadError('Those files come to more than 18 MB in total.')
      return
    }

    setUploadError(null)
    patch({
      attachments: [
        ...draft.attachments,
        ...incoming.map((file) => ({
          id: newId('att'),
          slot,
          name: file.name,
          bytes: file.size,
        })),
      ],
    })
  }

  async function submit(): Promise<void> {
    const ref = `IR-${String(Date.now()).slice(-8)}`
    await repo.create('requests', {
      reference: ref,
      service: 'insurance-review',
      status: 'submitted',
      submittedAt: nowMs(),
      answers: { ...draft, attachments: draft.attachments.map((file) => file.name) },
      consentGivenAt: nowMs(),
      delivery: 'queued',
    })
    clearDraft()
    setReference(ref)
  }

  if (reference !== null) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-lg py-16">
          <Card className="text-center">
            <span className="bg-success/15 inline-flex rounded-full p-2.5">
              <Check aria-hidden className="text-success size-5" />
            </span>
            <h1 className="text-text text-title mt-4 font-semibold">Request received</h1>
            <p className="text-text-2 mt-2 text-sm">
              Someone from the insurance team will be in touch within one working day.
            </p>
            <p className="rounded-tile bg-surface-2 text-text mt-5 p-3 font-mono text-sm">
              {reference}
            </p>
            <p className="text-caption text-text-3 mt-2">Keep this reference for any follow-up.</p>
            <div className="mt-6">
              <AppButton
                block
                onClick={() => {
                  void navigate('/')
                }}
              >
                Back to home
              </AppButton>
            </div>
          </Card>
        </section>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl py-10">
        <Link
          to="/request-centre"
          className="rounded-tile text-caption text-text-2 hover:text-text inline-flex items-center gap-1.5"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to Request Centre
        </Link>

        <h1 className="text-text mt-4 text-[clamp(1.6rem,4.5vw,2.25rem)] font-semibold tracking-tight text-balance">
          Insurance Review
        </h1>
        <p className="text-text-2 mt-2 text-sm">
          Seven short steps. Your answers are saved as you go, so you can come back to this.
        </p>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>
              Step {step + 1} of {STEP_TITLES.length}
            </SectionLabel>
            <span className="text-caption text-text-3">
              {Math.round(((step + 1) / STEP_TITLES.length) * 100)}%
            </span>
          </div>
          <span className="bg-surface-2 mt-2 block h-1.5 w-full overflow-hidden rounded-full">
            <span
              className="bg-gold block h-full rounded-full transition-[width] duration-300"
              style={{ width: `${String(((step + 1) / STEP_TITLES.length) * 100)}%` }}
            />
          </span>
        </div>

        <Card className="mt-5">
          <h2 className="text-lead text-text font-semibold">{STEP_TITLES[step]}</h2>

          <div className="mt-5 space-y-4">
            {step === 0 ? (
              <>
                <Field
                  label="Full name"
                  required
                  value={draft.fullName}
                  autoComplete="name"
                  onChange={(value) => {
                    patch({ fullName: value })
                  }}
                />
                <Field
                  label="Email address"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(value) => {
                    patch({ email: value })
                  }}
                />
                <Field
                  label="WhatsApp number"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="9876543210"
                  value={draft.whatsapp}
                  onChange={(value) => {
                    patch({ whatsapp: value })
                  }}
                />
                <Field
                  label="City"
                  value={draft.city}
                  autoComplete="address-level2"
                  onChange={(value) => {
                    patch({ city: value })
                  }}
                />

                <div className="rounded-tile border-border bg-surface-2 border p-3">
                  <label className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.consent}
                      onChange={(event) => {
                        patch({ consent: event.target.checked })
                      }}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
                    />
                    <span className="text-text-2 text-sm">
                      The insurance team may contact me about this request.
                    </span>
                  </label>
                  <p className="text-caption text-text-3 mt-2">
                    Your details are used only to answer this request and are kept until it is
                    closed.{' '}
                    <Link
                      to="/legal/privacy"
                      className="rounded-tile text-gold underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-wrap gap-2">
                {NEEDS.map((need) => (
                  <Chip
                    key={need}
                    label={need}
                    selected={draft.needs.includes(need)}
                    onClick={() => {
                      patch({
                        needs: draft.needs.includes(need)
                          ? draft.needs.filter((entry) => entry !== need)
                          : [...draft.needs, need],
                      })
                    }}
                  />
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <>
                <fieldset>
                  <legend className="text-caption text-text-2">
                    Do you currently have term insurance?
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TERM_ANSWERS.map((answer) => (
                      <Chip
                        key={answer}
                        label={answer}
                        selected={draft.hasTerm === answer}
                        onClick={() => {
                          patch({ hasTerm: answer })
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-caption text-text-2">
                    Do you currently have health insurance?
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HEALTH_ANSWERS.map((answer) => (
                      <Chip
                        key={answer}
                        label={answer}
                        selected={draft.hasHealth === answer}
                        onClick={() => {
                          patch({ hasHealth: answer })
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              </>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-wrap gap-2">
                {REASONS.map((reason) => (
                  <Chip
                    key={reason}
                    label={reason}
                    selected={draft.reason === reason}
                    onClick={() => {
                      patch({ reason })
                    }}
                  />
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <>
                <fieldset>
                  <legend className="text-caption text-text-2">How should we reach you?</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONTACT_METHODS.map((method) => (
                      <Chip
                        key={method}
                        label={method}
                        selected={draft.method === method}
                        onClick={() => {
                          patch({ method })
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-caption text-text-2">When suits you?</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONTACT_TIMES.map((time) => (
                      <Chip
                        key={time}
                        label={time}
                        selected={draft.time === time}
                        onClick={() => {
                          patch({ time })
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              </>
            ) : null}

            {step === 5 ? (
              <label htmlFor="comments" className="block">
                <span className="text-caption text-text-2">
                  Anything the team should know before they call
                </span>
                <textarea
                  id="comments"
                  rows={5}
                  value={draft.comments}
                  onChange={(event) => {
                    patch({ comments: event.target.value })
                  }}
                  className="rounded-tile border-border bg-surface text-text placeholder:text-text-3 focus-visible:outline-text-2 mt-1.5 w-full border p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                />
              </label>
            ) : null}

            {step === 6 ? (
              <>
                <p className="text-caption text-text-3">
                  PDF or images · up to {MAX_FILES} files · 10 MB each · 18 MB in total
                </p>
                <div className="space-y-2">
                  {DOCUMENT_SLOTS.map((slot) => (
                    <label
                      key={slot}
                      className="rounded-tile border-border bg-surface text-text-2 hover:border-border-strong flex cursor-pointer items-center gap-3 border border-dashed px-3 py-3 text-sm"
                    >
                      <Paperclip aria-hidden className="text-text-3 size-4 shrink-0" />
                      <span className="flex-1">{slot}</span>
                      <span className="text-caption text-gold">Choose file</span>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          addFiles(slot, event.target.files)
                          event.target.value = ''
                        }}
                      />
                    </label>
                  ))}
                </div>

                {uploadError === null ? null : (
                  <p className="text-caption text-danger flex items-start gap-2">
                    <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {uploadError}
                  </p>
                )}

                {draft.attachments.length === 0 ? null : (
                  <ul className="divide-border rounded-tile border-border divide-y overflow-hidden border">
                    {draft.attachments.map((file) => (
                      <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="text-text min-w-0 flex-1 truncate text-sm">
                          {file.name}
                        </span>
                        <span className="text-caption text-text-3 shrink-0 tabular-nums">
                          {Math.round(file.bytes / 1024)} KB
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => {
                            patch({
                              attachments: draft.attachments.filter(
                                (entry) => entry.id !== file.id,
                              ),
                            })
                          }}
                          className="rounded-tile text-text-2 hover:text-danger p-1"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </div>

          {showErrors && errors.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {errors.map((error) => (
                <li key={error} className="text-caption text-danger flex items-start gap-2">
                  <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex items-center gap-2">
            {step === 0 ? null : (
              <AppButton
                variant="ghost"
                onClick={() => {
                  setShowErrors(false)
                  setStep((value) => Math.max(0, value - 1))
                }}
              >
                <ChevronLeft aria-hidden className="size-4" />
                Back
              </AppButton>
            )}
            <div className="ml-auto">
              {isLast ? (
                <AppButton
                  onClick={() => {
                    void submit()
                  }}
                >
                  Submit request
                </AppButton>
              ) : (
                <AppButton onClick={next}>
                  Continue
                  <ChevronRight aria-hidden className="size-4" />
                </AppButton>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              clearDraft()
              setDraft(EMPTY)
              setStep(0)
              setShowErrors(false)
            }}
            className="rounded-tile text-caption text-text-2 hover:text-text underline underline-offset-2"
          >
            Discard this draft
          </button>
          <p className="text-caption text-text-3 mt-1">
            Removes everything you have typed from this device.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
