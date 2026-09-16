import { ChevronRight, PiggyBank, Shield, TrendingUp, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import type { RequestService } from '@/data/schema'
import { PublicShell } from './PublicShell'

const SERVICES: {
  slug: RequestService
  title: string
  line: string
  icon: LucideIcon
  available: boolean
}[] = [
  {
    slug: 'insurance-review',
    title: 'Insurance Review',
    line: 'An expert look at your term and health cover — new cover, top-ups, or a lower premium.',
    icon: Shield,
    available: true,
  },
  {
    slug: 'unlisted-shares',
    title: 'Unlisted Shares',
    line: 'Buy, sell, or get a valuation on unlisted and pre-IPO equity.',
    icon: TrendingUp,
    available: false,
  },
  {
    slug: 'msi-review',
    title: 'Multiple Income Review',
    line: 'Talk through second-income options that fit the time you actually have.',
    icon: Wallet,
    available: false,
  },
  {
    slug: 'pre-ipo',
    title: 'Pre-IPO Opportunities',
    line: 'Explore pre-IPO allocations with guidance from the team.',
    icon: PiggyBank,
    available: false,
  },
]

export function RequestCentre() {
  return (
    <PublicShell>
      <section className="py-12">
        <h1 className="text-text text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-balance">
          Request Centre
        </h1>
        <p className="text-lead text-text-2 mt-3 max-w-xl">
          Tell the team what you need. No account required — someone reads it and gets back to you
          within one working day.
        </p>
      </section>

      <section className="pb-14" aria-label="Services">
        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <Card key={service.slug} className="flex h-full flex-col">
              <service.icon aria-hidden className="text-gold size-5" />
              <h2 className="text-text mt-3 font-semibold">{service.title}</h2>
              <p className="text-text-2 mt-1.5 flex-1 text-sm">{service.line}</p>
              <div className="mt-5">
                {service.available ? (
                  <Link
                    to={`/request-centre/${service.slug}`}
                    className="rounded-tile text-gold hover:text-gold-strong focus-visible:outline-text-2 inline-flex items-center gap-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Start request
                    <ChevronRight aria-hidden className="size-4" />
                  </Link>
                ) : (
                  <span className="text-caption text-text-3">Form coming soon</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
