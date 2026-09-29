import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { PublicShell } from './PublicShell'
import { SERVICES } from './services'

export function RequestCentre() {
  return (
    <PublicShell title="Request Centre">
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
                <Link
                  to={`/request-centre/${service.slug}`}
                  className="rounded-tile text-gold hover:text-gold-strong focus-visible:outline-text-2 inline-flex items-center gap-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Start request
                  <ChevronRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
