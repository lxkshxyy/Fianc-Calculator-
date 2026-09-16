import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardHeader, Tile } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Derived } from '@/domain/derive'
import { useT } from '@/i18n'

/**
 * §9.1 item 3. The two inner tiles sit on `--surface-2`, which is exactly the
 * ground `--danger` had to be lifted to #F15050 for: a negative net worth is the
 * most-looked-at number in the product and it renders here.
 */
export function NetWorthCard({ derived }: { derived: Derived }) {
  const t = useT()

  return (
    <Card>
      <CardHeader
        title={t('netWorth.title')}
        icon={<Wallet aria-hidden className="text-text-2 size-4" />}
        action={
          <Link
            to="/app/assets"
            className="rounded-tile text-caption text-text-2 hover:text-text transition-colors"
          >
            {t('action.details')}
          </Link>
        }
      />

      <div className="py-6 text-center">
        <CurrencyText value={derived.netWorth} size="hero" />
        <p className="text-caption text-text-2 mt-2">{t('netWorth.caption')}</p>
      </div>

      <div className="gap-grid grid sm:grid-cols-2">
        <Tile>
          <SectionLabel>{t('netWorth.assets')}</SectionLabel>
          <div className="mt-1">
            <CurrencyText value={derived.assetsTotal} size="lead" tone="inherit" />
          </div>
        </Tile>
        <Tile>
          <SectionLabel>{t('netWorth.liabilities')}</SectionLabel>
          <div className="mt-1">
            <CurrencyText value={derived.liabilitiesTotal} size="lead" tone="inherit" />
          </div>
        </Tile>
      </div>
    </Card>
  )
}
