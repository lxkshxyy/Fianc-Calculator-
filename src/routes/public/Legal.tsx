import { Link, useParams } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { PublicShell } from './PublicShell'

/**
 * §6 — the five legal pages. Indian payment-gateway onboarding requires them, so
 * the routes exist and are linked from the footer.
 *
 * They carry a placeholder rather than invented policy text: a privacy policy is
 * a legal commitment about what a company actually does with data, and writing
 * one speculatively would be worse than an empty page a lawyer fills in.
 */
const DOCS: Record<string, { title: string; summary: string }> = {
  privacy: {
    title: 'Privacy Policy',
    summary:
      'What data is collected, where it is stored, who it is shared with, and how long it is kept.',
  },
  terms: {
    title: 'Terms & Conditions',
    summary: 'The agreement between the member and the company, and what each side is responsible for.',
  },
  refund: {
    title: 'Refund & Cancellation',
    summary: 'How a membership is cancelled, and the circumstances in which money is returned.',
  },
  disclaimer: {
    title: 'Disclaimer',
    summary:
      'That this product provides educational information and organisation, not regulated financial advice.',
  },
  shipping: {
    title: 'Shipment & Delivery',
    summary: 'How and when access to a digital membership is delivered after payment.',
  },
}

export function Legal() {
  const { doc } = useParams<{ doc: string }>()
  const entry = doc === undefined ? undefined : DOCS[doc]

  if (entry === undefined) {
    return (
      <PublicShell>
        <section className="py-16">
          <h1 className="font-semibold text-text text-title">Document not found</h1>
          <p className="mt-2 text-sm text-text-2">
            <Link to="/" className="rounded-tile text-gold underline underline-offset-2">
              Back to the home page
            </Link>
          </p>
        </section>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <section className="py-12">
        <h1 className="text-balance font-semibold text-[clamp(1.75rem,5vw,2.5rem)] text-text tracking-tight">
          {entry.title}
        </h1>
        <Card className="mt-6 max-w-prose">
          <p className="text-sm text-text-2">{entry.summary}</p>
          <p className="mt-4 text-sm text-text">This page is awaiting its final text.</p>
          <p className="mt-2 text-caption text-text-3">
            Legal pages are commitments a company makes and a regulator can hold it to. This one is
            deliberately blank until the operator's own counsel supplies the wording — a drafted
            stand-in would be a promise nobody made.
          </p>
        </Card>
      </section>
    </PublicShell>
  )
}
