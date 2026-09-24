import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gem,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/RecordForm'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { TierBadge } from '@/components/ui/TierBadge'
import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from '@/config/contact'
import { hasServer } from '@/config/server'
import { nowMs } from '@/data/schema/common'
import type { RequestTicket } from '@/data/schema'
import { useData, useProfile, useSnapshot } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { STAGES } from '@/domain/journey'
import { checkActivationCode, isActivationSupported, newUpgradeReference } from '@/lib/activation'
import { cn } from '@/lib/cn'
import { ModuleScreen } from './ModuleScreen'

/**
 * §9.5 — the in-app paywall, and the way through it.
 *
 * There is no payment provider yet and no price, so this does not pretend to
 * take money. Upgrading is a request the WRC team answers:
 *
 *   Request Diamond  →  the team calls, agrees the plan and payment
 *                    →  they give an activation code  →  Diamond opens
 *
 * The code is checked on the phone against the request's own reference
 * (lib/activation.ts), so this works today with no server behind it.
 */

type Row = { label: string; silver: boolean }

function stageRange(tier: 'silver' | 'diamond'): Row {
  const stages = STAGES.filter((stage) => stage.tier === tier)
  const first = stages[0]
  const last = stages.at(-1)
  const span =
    first === undefined || last === undefined
      ? ''
      : first === last
        ? `Stage ${String(first.index)}`
        : `Stages ${String(first.index)}–${String(last.index)}`
  /* Two names read fine; four do not fit a phone row, so a range gives first → last. */
  const names =
    stages.length <= 2
      ? stages.map((stage) => stage.name).join(' & ')
      : `${first?.name ?? ''} to ${last?.name ?? ''}`
  return { label: `${span} · ${names}`, silver: tier === 'silver' }
}

/* The stages read from the ladder itself, so renaming one renames it here too. */
const COMPARE: Row[] = [
  stageRange('silver'),
  stageRange('diamond'),
  { label: 'Income, budget, loans, net worth', silver: true },
  { label: 'Documents and scanning', silver: true },
  { label: 'Tax planning', silver: false },
  { label: 'Investments and goals', silver: false },
  { label: 'Insurance gap check', silver: false },
  { label: 'Family planning', silver: false },
  { label: 'Chat with a certified advisor', silver: false },
]

const BEST_TIME = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning (9–12)' },
  { value: 'afternoon', label: 'Afternoon (12–5)' },
  { value: 'evening', label: 'Evening (5–8)' },
]

/** An Indian mobile number, however it was typed: +91 98765 43210, 098765-43210, 9876543210. */
function mobileDigits(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

function pendingRequest(requests: RequestTicket[]): RequestTicket | null {
  const open = requests
    .filter((request) => request.service === 'diamond-upgrade' && request.status !== 'closed')
    .sort((a, b) => b.submittedAt - a.submittedAt)
  return open[0] ?? null
}

export function Upgrade() {
  const profile = useProfile()
  const snapshot = useSnapshot()
  const saveProfile = useData((state) => state.saveProfile)
  const createRecord = useData((state) => state.create)
  const updateRecord = useData((state) => state.update)
  const [asking, setAsking] = useState(false)
  if (profile === null || snapshot === null) return null

  const pending = pendingRequest(snapshot.requests)
  const isDiamond = profile.tier === 'diamond'

  return (
    <ModuleScreen
      title="Membership"
      subtitle="Silver is free and always will be. Diamond opens the rest of the ladder."
      icon={Gem}
    >
      <section
        aria-label="Diamond"
        className="rounded-card border-gold-dim bg-surface relative overflow-hidden border p-5"
      >
        <div className="flex items-start gap-4">
          <TierBadge tier="diamond" iconOnly className="size-12 [&>svg]:size-6" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title text-text font-semibold">Diamond</h2>
              {isDiamond ? (
                <span className="bg-success/15 text-success text-caption rounded-full px-2 py-0.5 font-medium">
                  Your plan
                </span>
              ) : (
                <span className="bg-gold text-on-gold text-caption rounded-full px-2 py-0.5 font-medium">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-meta text-text-2 mt-1">
              All six stages, every tool, and a certified advisor to ask.
            </p>
            {isDiamond ? null : (
              <p className="text-caption text-text-3 mt-2">
                Price shared by the WRC team when they call you.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          {isDiamond ? (
            <p className="rounded-tile bg-success/10 text-meta text-text flex items-center gap-2 p-3">
              <CheckCircle2 aria-hidden className="text-success size-4 shrink-0" />
              Diamond is active. Every stage and screen is open to you.
            </p>
          ) : pending === null ? (
            <AppButton
              variant="primary"
              block
              onClick={() => {
                setAsking(true)
              }}
            >
              <Gem aria-hidden className="size-4" />
              Request Diamond
            </AppButton>
          ) : (
            <PendingPanel
              request={pending}
              onActivated={async () => {
                await saveProfile({ tier: 'diamond' })
                await updateRecord('requests', pending.id, { status: 'closed' })
              }}
            />
          )}
        </div>

        {/*
         * The developer's shortcut to check both tiers, as before. Not in the
         * APK: `import.meta.env.DEV` is false in `npm run build`, so Rollup
         * drops this branch entirely.
         */}
        {import.meta.env.DEV ? (
          <AppButton
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              void saveProfile({ tier: isDiamond ? 'silver' : 'diamond' })
            }}
          >
            {isDiamond ? 'Dev: switch to Silver' : 'Dev: switch to Diamond'}
          </AppButton>
        ) : null}
      </section>

      {isDiamond ? null : (
        <section aria-label="How upgrading works">
          <SectionLabel>How it works</SectionLabel>
          <Card className="mt-3">
            <ol className="space-y-4">
              {[
                { title: 'Send a request', line: 'One tap, with the number to call.' },
                {
                  title: 'The WRC team calls you',
                  line: 'They confirm the plan and the payment with you.',
                },
                {
                  title: 'Enter your activation code',
                  line: 'Diamond opens the moment you type it in.',
                },
              ].map((step, index) => {
                /* Once a request exists, the first step is behind them. */
                const done = index === 0 && pending !== null
                return (
                  <li key={step.title} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'text-caption flex size-7 shrink-0 items-center justify-center rounded-full font-semibold',
                        done ? 'bg-success/15 text-success' : 'bg-gold/12 text-gold',
                      )}
                    >
                      {done ? (
                        <Check aria-hidden strokeWidth={3} className="size-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-meta text-text flex items-center gap-1.5 font-medium">
                        {step.title}
                        {done ? <span className="sr-only">(done)</span> : null}
                      </p>
                      <p className="text-caption text-text-2 mt-0.5">{step.line}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </section>
      )}

      <section aria-label="Compare plans">
        <SectionLabel>Compare plans</SectionLabel>
        <Card className="mt-3 p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border border-b">
                <th scope="col" className="text-caption text-text-2 px-4 py-3 font-medium">
                  What you get
                </th>
                <th scope="col" className="w-16 px-2 py-3 text-center">
                  <TierBadge tier="silver" size="sm" iconOnly className="mx-auto" />
                  <span className="sr-only">Silver</span>
                </th>
                <th scope="col" className="w-16 px-2 py-3 text-center">
                  <TierBadge tier="diamond" size="sm" iconOnly className="mx-auto" />
                  <span className="sr-only">Diamond</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {COMPARE.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="text-meta text-text px-4 py-2.5 font-normal">
                    {row.label}
                  </th>
                  <td className="px-2 py-2.5 text-center">
                    <Mark included={row.silver} />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <Mark included gold />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-caption text-text-3 mt-2">
          {isDiamond ? 'You are on Diamond.' : 'You are on Silver.'} Silver stays free, whatever you
          decide.
        </p>
      </section>

      {asking ? (
        <RequestSheet
          defaultName={profile.displayName}
          defaultPhone={profile.phone}
          onClose={() => {
            setAsking(false)
          }}
          onSubmit={async (answers) => {
            const created = await createRecord('requests', {
              reference: newUpgradeReference(),
              service: 'diamond-upgrade',
              status: 'submitted',
              submittedAt: nowMs(),
              answers,
              consentGivenAt: nowMs(),
              delivery: 'queued',
            })
            /* The number they gave is theirs to keep on the profile, if it had none. */
            if (created !== null && profile.phone === '') {
              await saveProfile({ phone: answers.phone })
            }
            if (created !== null) setAsking(false)
          }}
        />
      ) : null}
    </ModuleScreen>
  )
}

function Mark({ included, gold = false }: { included: boolean; gold?: boolean }) {
  return included ? (
    <>
      <Check
        aria-hidden
        strokeWidth={2.6}
        className={cn('mx-auto size-4', gold ? 'text-gold' : 'text-success')}
      />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <Lock aria-hidden className="text-text-3 mx-auto size-3.5" />
      <span className="sr-only">Not included</span>
    </>
  )
}

/** What a sent request looks like until the code arrives — and where the code goes. */
function PendingPanel({
  request,
  onActivated,
}: {
  request: RequestTicket
  onActivated: () => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const phone = typeof request.answers['phone'] === 'string' ? request.answers['phone'] : ''
  const message = `Hello WRC team, I'd like to upgrade to Diamond. My request reference is ${request.reference}.`

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (code.trim() === '') {
      setError('Enter the code the WRC team gave you.')
      return
    }
    if (!isActivationSupported()) {
      setError('Codes can only be checked in the app or over a secure (https) connection.')
      return
    }
    setChecking(true)
    const ok = await checkActivationCode(request.reference, code)
    setChecking(false)
    if (!ok) {
      setError(`That code does not match request ${request.reference}. Check it and try again.`)
      return
    }
    await onActivated()
  }

  /*
   * Honest about where the request actually is. With a server it has been
   * delivered; without one it is saved on this phone, and the person is given
   * the ways that exist today to get it to the team.
   */
  const delivered = hasServer()

  return (
    <div className="space-y-4">
      <div className="rounded-tile bg-surface-2 p-3">
        <p className="text-meta text-text flex items-center gap-2 font-medium">
          <Clock aria-hidden className="text-gold size-4 shrink-0" />
          {delivered ? 'Request sent — the WRC team will call you' : 'Request ready to send'}
        </p>
        <p className="text-caption text-text-2 mt-1">
          {delivered
            ? `${phone === '' ? 'They will be in touch' : `They will call ${phone}`} to agree the plan and payment. Your reference:`
            : 'Send this reference to the WRC team and they will call you to agree the plan and payment:'}
        </p>
        <p className="rounded-tile bg-surface text-text mt-2 inline-block px-3 py-1.5 font-mono text-sm tracking-wider">
          {request.reference}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WHATSAPP_NUMBER === '' ? null : (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-button border-border text-meta text-text hover:bg-surface inline-flex min-h-11 items-center gap-2 border px-3"
            >
              <MessageCircle aria-hidden className="size-4" />
              Send on WhatsApp
            </a>
          )}
          {SUPPORT_EMAIL === '' ? null : (
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Diamond request ${request.reference}`)}&body=${encodeURIComponent(message)}`}
              className="rounded-button border-border text-meta text-text hover:bg-surface inline-flex min-h-11 items-center gap-2 border px-3"
            >
              <Mail aria-hidden className="size-4" />
              Send by email
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`${message}${phone === '' ? '' : ` Please call me on ${phone}.`}`)
                .then(() => {
                  setCopied(true)
                })
                .catch(() => undefined)
            }}
            className="rounded-button border-border text-meta text-text hover:bg-surface inline-flex min-h-11 items-center gap-2 border px-3"
          >
            {copied ? (
              <Check aria-hidden className="text-success size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copied ? 'Copied' : 'Copy message'}
          </button>
        </div>
      </div>

      <form noValidate onSubmit={(event) => void submit(event)}>
        <TextField
          label="Activation code"
          placeholder="XXXX-XXXX"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          error={error}
          hint="Given to you by the WRC team once payment is done."
          onChange={(event) => {
            setCode(event.target.value)
            setError(undefined)
          }}
        />
        <AppButton type="submit" variant="primary" block disabled={checking}>
          <KeyRound aria-hidden className="size-4" />
          {checking ? 'Checking…' : 'Activate Diamond'}
        </AppButton>
      </form>
    </div>
  )
}

type RequestAnswers = { name: string; phone: string; email: string; bestTime: string }

function RequestSheet({
  defaultName,
  defaultPhone,
  onClose,
  onSubmit,
}: {
  defaultName: string
  defaultPhone: string
  onClose: () => void
  onSubmit: (answers: RequestAnswers) => Promise<void>
}) {
  const accountEmail = useSession((state) => state.account?.email ?? '')
  const [name, setName] = useState(defaultName === 'You' ? '' : defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [email, setEmail] = useState(accountEmail)
  const [bestTime, setBestTime] = useState('any')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (name.trim() === '') next['name'] = 'Your name is needed.'
    const digits = mobileDigits(phone)
    if (digits === null) next['phone'] = 'Enter a 10-digit mobile number.'
    if (email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next['email'] = 'That email does not look right.'
    }
    if (!consent) next['consent'] = 'Tick this so the team is allowed to call you.'
    setErrors(next)
    if (Object.keys(next).length > 0 || digits === null) return
    setBusy(true)
    await onSubmit({
      name: name.trim(),
      phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      email: email.trim(),
      bestTime,
    })
    setBusy(false)
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Request Diamond"
      description="The WRC team calls you to confirm the plan and payment. Nothing is charged here."
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <TextField
          label="Your name"
          autoComplete="name"
          value={name}
          error={errors['name']}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          value={phone}
          error={errors['phone']}
          hint="The number the team should call."
          onChange={(event) => {
            setPhone(event.target.value)
          }}
        />
        <TextField
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={email}
          error={errors['email']}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
        />
        <SelectField
          label="Best time to call"
          value={bestTime}
          options={BEST_TIME}
          onChange={setBestTime}
        />

        <label className="rounded-tile bg-surface-2 mt-1 flex items-start gap-3 p-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked)
            }}
            className="accent-gold mt-0.5 size-5 shrink-0"
          />
          <span className="text-meta text-text-2">
            The WRC team may contact me on this number about Diamond membership.
          </span>
        </label>
        <p className="text-caption text-danger mt-1 min-h-[18px]">{errors['consent'] ?? ''}</p>

        <div className="mt-2 flex gap-2">
          <AppButton type="submit" variant="primary" className="flex-1" disabled={busy}>
            <Send aria-hidden className="size-4" />
            {busy ? 'Sending…' : 'Send request'}
          </AppButton>
          <AppButton variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
        </div>
      </form>
    </Sheet>
  )
}
