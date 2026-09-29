import { ClipboardList, HelpCircle, Mail, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { SUPPORT_EMAIL } from '@/config/contact'
import { cn } from '@/lib/cn'
import { teamWhatsAppUrl } from '@/lib/whatsapp'
import { PublicShell } from './PublicShell'

const TOPICS = [
  'A general question',
  'Membership and Diamond',
  'A request I sent',
  'Help using the app',
  'Something else',
]

/**
 * How to reach the team. There is no server to post a form to yet, so the form
 * writes the message into a WhatsApp chat with the team — the one channel that
 * reaches a person today — and the visitor presses send there.
 */
export function Contact() {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState(TOPICS[0] ?? '')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({})

  const direct = teamWhatsAppUrl('Hello WRC team, ')

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const next: typeof errors = {}
    if (name.trim() === '') next.name = 'Enter your name.'
    if (message.trim() === '') next.message = 'Write a line or two about what you need.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const url = teamWhatsAppUrl(
      `Hello WRC team, this is ${name.trim()}.\nTopic: ${topic}\n\n${message.trim()}`,
    )
    if (url !== null) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const ways: { icon: LucideIcon; title: string; line: string; to: string; label: string }[] = [
    {
      icon: ClipboardList,
      title: 'Request Centre',
      line: 'Insurance, unlisted shares, pre-IPO and second-income reviews. No account needed.',
      to: '/request-centre',
      label: 'Open the Request Centre',
    },
    {
      icon: HelpCircle,
      title: 'Questions and answers',
      line: 'Where your data lives, what each membership opens, and how to upgrade.',
      to: '/faq',
      label: 'Read the FAQ',
    },
  ]

  return (
    <PublicShell title="Contact">
      <section className="py-12">
        <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Talk to the team
        </h1>
        <p className="text-lead text-text-2 mt-3 max-w-2xl">
          A question about the app, your membership or a request you sent — we usually reply within
          one working day.
        </p>
      </section>

      <section className="grid gap-6 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card>
          <h2 className="text-text font-semibold">Send a message</h2>
          <p className="text-caption text-text-2 mt-1">
            It opens in WhatsApp with your message already written, ready to send.
          </p>
          <form noValidate onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="contact-name" className="text-text text-sm font-medium">
                Your name
              </label>
              <input
                id="contact-name"
                autoComplete="name"
                value={name}
                aria-invalid={errors.name !== undefined}
                onChange={(event) => {
                  setName(event.target.value)
                }}
                className={cn(
                  'rounded-button bg-surface-2 text-text focus-visible:outline-text-2 mt-2 min-h-11 w-full border px-3 text-sm focus-visible:outline-2',
                  errors.name === undefined ? 'border-border' : 'border-danger',
                )}
              />
              {errors.name === undefined ? null : (
                <p className="text-caption text-danger mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="contact-topic" className="text-text text-sm font-medium">
                What is it about?
              </label>
              <select
                id="contact-topic"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value)
                }}
                className="rounded-button border-border bg-surface-2 text-text focus-visible:outline-text-2 mt-2 min-h-11 w-full border px-3 text-sm focus-visible:outline-2"
              >
                {TOPICS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contact-message" className="text-text text-sm font-medium">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={message}
                aria-invalid={errors.message !== undefined}
                onChange={(event) => {
                  setMessage(event.target.value)
                }}
                className={cn(
                  'rounded-button bg-surface-2 text-text focus-visible:outline-text-2 mt-2 w-full border px-3 py-2.5 text-sm focus-visible:outline-2',
                  errors.message === undefined ? 'border-border' : 'border-danger',
                )}
              />
              {errors.message === undefined ? null : (
                <p className="text-caption text-danger mt-1">{errors.message}</p>
              )}
            </div>
            <AppButton type="submit" variant="primary" disabled={direct === null}>
              <MessageCircle aria-hidden className="size-4" />
              Continue in WhatsApp
            </AppButton>
          </form>
        </Card>

        <div className="space-y-4">
          {direct === null ? null : (
            <Card>
              <MessageCircle aria-hidden className="text-gold size-5" />
              <h2 className="text-text mt-3 font-semibold">WhatsApp</h2>
              <p className="text-text-2 mt-1.5 text-sm">The quickest way to reach a person.</p>
              <a
                href={direct}
                target="_blank"
                rel="noreferrer"
                className={buttonClass({ variant: 'outline', size: 'sm' }, 'mt-4')}
              >
                Start a chat
              </a>
            </Card>
          )}
          {SUPPORT_EMAIL === '' ? null : (
            <Card>
              <Mail aria-hidden className="text-gold size-5" />
              <h2 className="text-text mt-3 font-semibold">Email</h2>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-tile text-gold mt-1.5 inline-block text-sm underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
            </Card>
          )}
          {ways.map((way) => (
            <Card key={way.title}>
              <way.icon aria-hidden className="text-gold size-5" />
              <h2 className="text-text mt-3 font-semibold">{way.title}</h2>
              <p className="text-text-2 mt-1.5 text-sm">{way.line}</p>
              <Link
                to={way.to}
                className="rounded-tile text-gold mt-3 inline-block text-sm font-medium underline underline-offset-2"
              >
                {way.label}
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
