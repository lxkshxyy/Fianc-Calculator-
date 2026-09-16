import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionLabel } from '@/components/ui/SectionLabel'

/** §6 — the `*` route. A real screen, not a bare string. */
export function NotFound() {
  return (
    <div className="bg-bg flex min-h-dvh items-center justify-center px-4 py-16">
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
                className="rounded-button bg-gold text-meta text-on-gold hover:bg-gold-strong inline-flex min-h-11 items-center px-4 font-medium transition-colors duration-150"
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
