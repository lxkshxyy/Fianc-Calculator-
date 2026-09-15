import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardHeader, Tile } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Derived } from '@/domain/derive'

/**
 * §9.1 item 3. The two inner tiles sit on `--surface-2`, which is exactly the
 * ground `--danger` had to be lifted to #F15050 for: a negative net worth is the
 * most-looked-at number in the product and it renders here.
 */
export function NetWorthCard({ derived }: { derived: Derived }) {
  return (
    <Card>
      <CardHeader
        title="Net Worth"
        icon={<Wallet aria-hidden className="size-4 text-text-2" />}
        action={
          <Link
            to="/app/assets"
            className="rounded-tile text-caption text-text-2 transition-colors hover:text-text"
          >
            Details →
          </Link>
        }
      />

      <div className="py-6 text-center">
        <CurrencyText value={derived.netWorth} size="hero" />
        <p className="mt-2 text-caption text-text-2">Everything you own minus everything you owe</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile>
          <SectionLabel>Assets</SectionLabel>
          <div className="mt-1">
            <CurrencyText value={derived.assetsTotal} size="lead" tone="inherit" />
          </div>
        </Tile>
        <Tile>
          <SectionLabel>Liabilities</SectionLabel>
          <div className="mt-1">
            <CurrencyText value={derived.liabilitiesTotal} size="lead" tone="inherit" />
          </div>
        </Tile>
      </div>
    </Card>
  )
}
