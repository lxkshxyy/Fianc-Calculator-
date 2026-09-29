import { Check, ChevronLeft, MessageCircle } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { nowMs } from '@/data/schema'
import { repo } from '@/data/repo'
import { cn } from '@/lib/cn'
import { teamWhatsAppUrl } from '@/lib/whatsapp'
import { PublicShell } from './PublicShell'
import { serviceBySlug, type ServiceInfo, type ServiceQuestion } from './services'

/**
 * §9.3 — the Request Centre's three shorter services: Unlisted Shares, Multiple
 * Income Review and Pre-IPO. One form, with each service's own questions from
 * services.ts between the contact details and the consent.
 *
 * It follows the Insurance Review form where it matters: no account needed,
 * consent unticked until the person ticks it, and each problem named next to
 * the field it is about rather than in a banner at the top.
 *
 * Delivery: the request is saved and queued for the WRC server like every other
 * request. Until that server exists nothing collects the queue, so the thank-you
 * screen offers to send the same request on WhatsApp — which does reach the
 * team today — rather than promising a call that nothing has arranged.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/
const CONTACT_METHODS = ['WhatsApp', 'Phone', 'Email']
const CONTACT_TIMES = ['Morning', 'Afternoon', 'Evening']

type Answers = Record<string, string | string[]>

type Contact = {
  fullName: string
  email: string
  whatsapp: string
  city: string
  method: string
  time: string
  comments: string
  consent: boolean
}

const EMPTY_CONTACT: Contact = {
  fullName: '',
  email: '',
  whatsapp: '',
  city: '',
  method: 'WhatsApp',
  time: '',
  comments: '',
  consent: false,
}

function answerText(value: string | string[] | undefined): string {
  if (value === undefined) return ''
  return Array.isArray(value) ? value.join(', ') : value
}

function validate(
  service: ServiceInfo,
  contact: Contact,
  answers: Answers,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (contact.fullName.trim() === '') errors['fullName'] = 'Enter your name.'
  if (!EMAIL_PATTERN.test(contact.email.trim())) errors['email'] = 'Enter a valid email address.'
  if (!PHONE_PATTERN.test(contact.whatsapp.replace(/\s/g, ''))) {
    errors['whatsapp'] = 'Enter a 10-digit mobile number.'
  }
  for (const question of service.questions) {
    if (question.required && answerText(answers[question.id]).trim() === '') {
      errors[question.id] = 'Please answer this one.'
    }
  }
  if (!contact.consent) errors['consent'] = 'Tick the consent box to continue.'
  return errors
}

export function ServiceRequest() {
  const { service: slug } = useParams<{ service: string }>()
  const service = serviceBySlug(slug)

  if (service === undefined || service.slug === 'insurance-review') {
    return (
      <PublicShell title="Request Centre">
        <section className="py-16">
          <h1 className="text-text text-title font-semibold">That service was not found</h1>
          <p className="text-text-2 mt-2 text-sm">
            <Link
              to="/request-centre"
              className="rounded-tile text-gold underline underline-offset-2"
            >
              See every service in the Request Centre
            </Link>
          </p>
        </section>
      </PublicShell>
    )
  }

  /* Keyed on the service, so moving between two of them starts a clean form. */
  return <ServiceForm key={service.slug} service={service} />
}

function ServiceForm({ service }: { service: ServiceInfo }) {
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [reference, setReference] = useState<string | null>(null)

  function patch(next: Partial<Contact>): void {
    setContact((current) => ({ ...current, ...next }))
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const found = validate(service, contact, answers)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      /* Take the person to the first thing that needs them. */
      const first = Object.keys(found)[0]
      if (first !== undefined) document.getElementById(`field-${first}`)?.focus()
      return
    }

    setBusy(true)
    try {
      const ref = `${service.prefix}-${String(Date.now()).slice(-8)}`
      await repo.create('requests', {
        reference: ref,
        service: service.slug,
        status: 'submitted',
        submittedAt: nowMs(),
        answers: { ...contact, ...answers },
        consentGivenAt: nowMs(),
        delivery: 'queued',
      })
      setReference(ref)
    } finally {
      setBusy(false)
    }
  }

  if (reference !== null) {
    const lines = [
      `Hello WRC team, I have sent a ${service.title} request.`,
      `Reference: ${reference}`,
      `Name: ${contact.fullName.trim()}`,
      `Mobile: ${contact.whatsapp.trim()}`,
      ...service.questions
        .filter((question) => answerText(answers[question.id]).trim() !== '')
        .map((question) => `${question.label} ${answerText(answers[question.id])}`),
      contact.comments.trim() === '' ? '' : `Notes: ${contact.comments.trim()}`,
    ].filter((line) => line !== '')
    const whatsapp = teamWhatsAppUrl(lines.join('\n'))

    return (
      <PublicShell title={service.title}>
        <section className="mx-auto max-w-lg py-16">
          <Card className="text-center">
            <span className="bg-success/15 inline-flex rounded-full p-2.5">
              <Check aria-hidden className="text-success size-5" />
            </span>
            <h1 className="text-text text-title mt-4 font-semibold">Request received</h1>
            <p className="text-text-2 mt-2 text-sm">
              Keep this reference for any follow-up. The team usually replies within one working
              day.
            </p>
            <p className="rounded-tile bg-surface-2 text-text mt-5 p-3 font-mono text-sm">
              {reference}
            </p>
            {whatsapp === null ? null : (
              <>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass({ variant: 'primary', block: true }, 'mt-6')}
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Send it on WhatsApp too
                </a>
                <p className="text-caption text-text-3 mt-2">
                  Opens a chat with the team, your request already typed.
                </p>
              </>
            )}
            <div className="mt-4">
              <Link to="/request-centre" className={buttonClass({ variant: 'ghost', block: true })}>
                Back to the Request Centre
              </Link>
            </div>
          </Card>
        </section>
      </PublicShell>
    )
  }

  return (
    <PublicShell title={service.title}>
      <section className="mx-auto max-w-2xl py-10">
        <Link
          to="/request-centre"
          className="rounded-tile text-caption text-text-2 hover:text-text inline-flex items-center gap-1.5"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back to Request Centre
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <span className="rounded-tile bg-surface-2 shrink-0 p-2">
            <service.icon aria-hidden className="text-gold size-5" />
          </span>
          <div>
            <h1 className="text-text text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-tight">
              {service.title}
            </h1>
            <p className="text-text-2 mt-1 text-sm">{service.line}</p>
          </div>
        </div>

        <form noValidate onSubmit={(event) => void submit(event)} className="mt-8 space-y-6">
          <Card>
            <SectionLabel>About you</SectionLabel>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextInput
                id="fullName"
                label="Full name"
                autoComplete="name"
                value={contact.fullName}
                error={errors['fullName']}
                onChange={(value) => {
                  patch({ fullName: value })
                }}
              />
              <TextInput
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={contact.email}
                error={errors['email']}
                onChange={(value) => {
                  patch({ email: value })
                }}
              />
              <TextInput
                id="whatsapp"
                label="WhatsApp number"
                type="tel"
                autoComplete="tel"
                value={contact.whatsapp}
                error={errors['whatsapp']}
                onChange={(value) => {
                  patch({ whatsapp: value })
                }}
              />
              <TextInput
                id="city"
                label="City (optional)"
                autoComplete="address-level2"
                value={contact.city}
                onChange={(value) => {
                  patch({ city: value })
                }}
              />
            </div>
          </Card>

          <Card>
            <SectionLabel>Your request</SectionLabel>
            <div className="mt-4 space-y-5">
              {service.questions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  error={errors[question.id]}
                  onChange={(value) => {
                    setAnswers((current) => ({ ...current, [question.id]: value }))
                  }}
                />
              ))}
              <div>
                <label htmlFor="field-comments" className="text-text text-sm font-medium">
                  Anything else we should know? (optional)
                </label>
                <textarea
                  id="field-comments"
                  rows={3}
                  value={contact.comments}
                  onChange={(event) => {
                    patch({ comments: event.target.value })
                  }}
                  className="rounded-button border-border bg-surface-2 text-text focus-visible:outline-text-2 mt-2 w-full border px-3 py-2.5 text-sm focus-visible:outline-2"
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionLabel>How to reach you</SectionLabel>
            <div className="mt-4 space-y-4">
              <Choices
                label="Best way to reach you"
                options={CONTACT_METHODS}
                value={contact.method}
                onChange={(value) => {
                  patch({ method: value })
                }}
              />
              <Choices
                label="Best time (optional)"
                options={CONTACT_TIMES}
                value={contact.time}
                onChange={(value) => {
                  patch({ time: value })
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-2.5">
              <input
                id="field-consent"
                type="checkbox"
                checked={contact.consent}
                aria-invalid={errors['consent'] !== undefined}
                onChange={(event) => {
                  patch({ consent: event.target.checked })
                }}
                className="accent-accent mt-0.5 size-4.5 shrink-0"
              />
              <label htmlFor="field-consent" className="text-caption text-text-2 leading-snug">
                I agree that the WRC team may contact me about this request, and may keep these
                details until it is closed. See the{' '}
                <Link to="/legal/privacy" className="text-accent font-semibold">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {errors['consent'] === undefined ? null : (
              <p className="text-caption text-danger mt-1.5">{errors['consent']}</p>
            )}
          </Card>

          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="text-caption text-danger">
              A few answers need another look — each one is marked above.
            </p>
          ) : null}

          <AppButton type="submit" variant="primary" block disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </AppButton>
        </form>
      </section>
    </PublicShell>
  )
}

function TextInput({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  autoComplete?: string
}) {
  const invalid = error !== undefined
  return (
    <div>
      <label htmlFor={`field-${id}`} className="text-text text-sm font-medium">
        {label}
      </label>
      <input
        id={`field-${id}`}
        type={type}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className={cn(
          'rounded-button bg-surface-2 text-text focus-visible:outline-text-2 mt-2 min-h-11 w-full border px-3 text-sm focus-visible:outline-2',
          invalid ? 'border-danger' : 'border-border',
        )}
      />
      {invalid ? <p className="text-caption text-danger mt-1">{error}</p> : null}
    </div>
  )
}

function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: ServiceQuestion
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  error?: string
}) {
  const labelId = useId()

  if (question.kind === 'text') {
    return (
      <div>
        <label htmlFor={`field-${question.id}`} className="text-text text-sm font-medium">
          {question.label}
          {question.required ? null : ' (optional)'}
        </label>
        {question.hint === undefined ? null : (
          <p className="text-caption text-text-3 mt-0.5">{question.hint}</p>
        )}
        <input
          id={`field-${question.id}`}
          value={typeof value === 'string' ? value : ''}
          aria-invalid={error !== undefined}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className={cn(
            'rounded-button bg-surface-2 text-text focus-visible:outline-text-2 mt-2 min-h-11 w-full border px-3 text-sm focus-visible:outline-2',
            error === undefined ? 'border-border' : 'border-danger',
          )}
        />
        {error === undefined ? null : <p className="text-caption text-danger mt-1">{error}</p>}
      </div>
    )
  }

  const selected = Array.isArray(value) ? value : value === undefined ? [] : [value]

  return (
    <fieldset aria-labelledby={labelId} aria-invalid={error !== undefined}>
      <legend id={labelId} className="text-text text-sm font-medium">
        {question.label}
        {question.required ? null : ' (optional)'}
      </legend>
      {question.hint === undefined ? null : (
        <p className="text-caption text-text-3 mt-0.5">{question.hint}</p>
      )}
      <div id={`field-${question.id}`} tabIndex={-1} className="mt-2 flex flex-wrap gap-2">
        {(question.options ?? []).map((option) => {
          const on = selected.includes(option)
          return (
            <ChoiceChip
              key={option}
              pressed={on}
              onClick={() => {
                if (question.kind === 'multi') {
                  onChange(on ? selected.filter((item) => item !== option) : [...selected, option])
                } else {
                  onChange(on ? '' : option)
                }
              }}
            >
              {option}
            </ChoiceChip>
          )
        })}
      </div>
      {error === undefined ? null : <p className="text-caption text-danger mt-1.5">{error}</p>}
    </fieldset>
  )
}

function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  const labelId = useId()
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="text-text text-sm font-medium">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option}
            pressed={value === option}
            onClick={() => {
              onChange(value === option ? '' : option)
            }}
          >
            {option}
          </ChoiceChip>
        ))}
      </div>
    </div>
  )
}

function ChoiceChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
        pressed
          ? 'bg-gold text-on-gold border-transparent font-medium'
          : 'border-border text-text-2 hover:border-border-strong hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
