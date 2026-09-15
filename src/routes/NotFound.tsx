import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionLabel } from '@/components/ui/SectionLabel'

/** §6 — the `*` route. A real screen, not a bare string. */
export function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <SectionLabel>404</SectionLabel>
        <Card className="mt-3">
          <EmptyState
            icon={Compass}
            title="That page does not exist"
            description="The link may be out of date, or the screen may not be built yet."
            action={
              <Link
                to="/app/dashboard"
                className="inline-flex min-h-11 items-center rounded-button bg-gold px-4 text-meta font-medium text-on-gold transition-colors duration-150 hover:bg-gold-strong"
              >
                Go to dashboard
              </Link>
            }
          />
        </Card>
      </div>
    </div>
  )
}
