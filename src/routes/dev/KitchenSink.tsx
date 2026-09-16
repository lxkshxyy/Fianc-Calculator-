import {
  Banknote,
  Compass,
  Flag,
  Gauge,
  Inbox,
  Landmark,
  PiggyBank,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card, CardHeader, Tile } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { EmptyState } from '@/components/ui/EmptyState'
import { LockedOverlay } from '@/components/ui/LockedOverlay'
import { MetricTile } from '@/components/ui/MetricTile'
import { NumberField } from '@/components/ui/NumberField'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sheet } from '@/components/ui/Sheet'
import { StageCard } from '@/components/ui/StageCard'
import { StatusDot } from '@/components/ui/StatusDot'
import { TierBadge } from '@/components/ui/TierBadge'
import { formatPercent, formatFull } from '@/lib/money'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'

/** Every token §4.1 defines. The audit below proves each one resolves in all three states. */
const TOKEN_NAMES = [
  '--bg',
  '--bg-elevated',
  '--surface',
  '--surface-2',
  '--border',
  '--border-strong',
  '--text',
  '--text-2',
  '--text-label',
  '--text-3',
  '--gold',
  '--gold-strong',
  '--gold-dim',
  '--on-gold',
  '--danger',
  '--warn',
  '--success',
  '--info',
] as const

/**
 * Stage fixtures only. The six canonical stages, their taglines and their wealth
 * bands are pending from the client and land in `src/domain/journey.ts` at
 * Phase 4 — §7 forbids any screen hardcoding a stage name, and this is a dev
 * harness, not a screen.
 */
const STAGE_FIXTURES = [
  { name: 'Stage One', tagline: 'Know where you stand', icon: Compass, state: 'complete' },
  { name: 'Stage Two', tagline: 'Find the leaks', icon: Gauge, state: 'current' },
  { name: 'Stage Three', tagline: 'Build the floor', icon: Landmark, state: 'available' },
  { name: 'Stage Four', tagline: 'Optimise the engine', icon: Rocket, state: 'locked' },
] as const

function TokenAudit() {
  const [resolved, setResolved] = useState<{ name: string; value: string }[]>([])

  useEffect(() => {
    const read = (): void => {
      const style = window.getComputedStyle(document.documentElement)
      setResolved(TOKEN_NAMES.map((name) => ({ name, value: style.getPropertyValue(name).trim() })))
    }
    read()
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', read)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => {
      query.removeEventListener('change', read)
      observer.disconnect()
    }
  }, [])

  const missing = resolved.filter((token) => token.value === '')

  return (
    <Card>
      <CardHeader title="Token audit" />
      <p className="text-meta text-text-2 mb-4">
        Every §4.1 token, resolved live from <code>:root</code>. An empty value means the token is
        defined only inside a media block and is undefined in the current state — which is the
        failure the un-stamped system theme exists to catch.
      </p>
      {missing.length > 0 ? (
        <p className="rounded-tile border-danger text-meta text-danger mb-4 border px-3 py-2">
          {missing.length} token(s) unresolved: {missing.map((t) => t.name).join(', ')}
        </p>
      ) : (
        <p className="rounded-tile border-success text-meta text-success mb-4 border px-3 py-2">
          All {resolved.length} tokens resolve in this state.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {resolved.map((token) => (
          <div key={token.name} className="rounded-tile bg-surface-2 flex items-center gap-2 p-2">
            <span
              className="border-border size-6 shrink-0 rounded border"
              style={{ background: 'var(' + token.name + ')' }}
            />
            <span className="min-w-0">
              <span className="text-caption text-text block truncate">{token.name}</span>
              <span className="tabular text-micro text-text-2 block truncate">
                {token.value === '' ? 'UNRESOLVED' : token.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  )
}

export function KitchenSink() {
  const { preference, setPreference } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('1.5L')
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = (): void => {
      setSystemDark(query.matches)
    }
    sync()
    query.addEventListener('change', sync)
    return () => {
      query.removeEventListener('change', sync)
    }
  }, [])

  const effective =
    preference === 'system' ? (systemDark ? 'dark (from OS)' : 'light (from OS)') : preference

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Phase 1 · Design system</SectionLabel>
          <h1 className="text-page text-text mt-2 font-bold tracking-tight">
            Kitchen <span className="text-gold">Sink</span>
          </h1>
          <p className="text-meta text-text-2 mt-1">
            Every §4.4 component, in all three theme states.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Theme</SectionLabel>
          <div className="flex gap-2" role="group" aria-label="Theme preference">
            {THEME_PREFERENCES.map((option: ThemePreference) => (
              <AppButton
                key={option}
                size="sm"
                variant={preference === option ? 'primary' : 'outline'}
                aria-pressed={preference === option}
                onClick={() => {
                  setPreference(option)
                }}
              >
                {option}
              </AppButton>
            ))}
          </div>
          <p className="text-caption text-text-2">
            Resolved: <span className="text-text">{effective}</span>
          </p>
        </div>
      </header>

      <div className="space-y-10">
        <TokenAudit />

        <Row title="Type scale">
          <Card>
            <div className="space-y-2">
              {(
                [
                  ['hero 44', 'text-hero'],
                  ['page 34', 'text-page'],
                  ['heading 24', 'text-heading'],
                  ['title 20', 'text-title'],
                  ['lead 16', 'text-lead'],
                  ['body 14', 'text-body'],
                  ['meta 13', 'text-meta'],
                  ['caption 12', 'text-caption'],
                  ['micro 11', 'text-micro'],
                ] as const
              ).map(([label, cls]) => (
                <p key={label} className={cls + ' text-text'}>
                  <span className="text-text-3">{label}</span> — {formatFull(1_570_000)}
                </p>
              ))}
            </div>
          </Card>
        </Row>

        <Row title="Currency — §4.5 boundaries">
          <Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 850, 15400, 99999, 100000, 1570000, 9997000, 15700000, -1570000, null].map(
                (value, index) => (
                  <Tile key={index}>
                    <p className="text-micro text-text-3">{value === null ? 'null' : value}</p>
                    <CurrencyText value={value} size="lead" className="font-semibold" />
                  </Tile>
                ),
              )}
            </div>
            <p className="text-caption text-text-2 mt-4">
              Hover a compact figure to see the exact rupee value. Negative renders in{' '}
              <code>--danger</code>; null renders an em dash, never NaN.
            </p>
          </Card>
        </Row>

        <Row title="Key metrics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Monthly income"
              icon={Banknote}
              value={<CurrencyText value={85000} size="heading" />}
              delta={{ direction: 'up', text: '+4.2% vs last month', isGood: true }}
            />
            <MetricTile
              label="Active goals"
              icon={Target}
              value={<span className="tabular text-heading">2</span>}
            />
            <MetricTile
              label="Savings rate"
              icon={PiggyBank}
              value={<span className="tabular text-heading">{formatPercent(0.29)}</span>}
              delta={{ direction: 'down', text: '-1.1 pts', isGood: false }}
            />
            <MetricTile
              label="Health score"
              icon={TrendingUp}
              value={<span className="tabular text-heading">72</span>}
            />
          </div>
        </Row>

        <Row title="Card, tile and net worth">
          <Card>
            <CardHeader
              title="Net worth"
              icon={<Wallet aria-hidden className="size-4" />}
              action={
                <AppButton variant="ghost" size="sm">
                  Details →
                </AppButton>
              }
            />
            <div className="py-2 text-center">
              <CurrencyText value={-1810000} size="hero" className="font-bold" />
              <p className="text-meta text-text-2 mt-1">Everything you own – everything you owe</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Tile>
                <SectionLabel>Assets</SectionLabel>
                <CurrencyText value={0} size="title" className="mt-1 block font-semibold" />
              </Tile>
              <Tile>
                <SectionLabel>Liabilities</SectionLabel>
                <CurrencyText value={1810000} size="title" className="mt-1 block font-semibold" />
              </Tile>
            </div>
          </Card>
        </Row>

        <Row title="Progress and status">
          <Card>
            <div className="flex flex-wrap items-start gap-8">
              <ProgressRing value={0.64} label="Goals" caption="2 of 3 on track" />
              <ProgressRing value={0.35} label="Stage" caption="4 of 11 tasks" />
              <ProgressRing value={null} label="Savings rate" caption="No income recorded" />
              <div className="space-y-3">
                <SectionLabel>Health bands</SectionLabel>
                {(
                  [
                    ['danger', 'Needs Work', '0–39', false],
                    ['warn', 'Getting There', '40–69', false],
                    ['success', 'Strong', '70–84', false],
                    ['success', 'Excellent', '85–100', true],
                  ] as const
                ).map(([tone, name, range, ringed]) => (
                  <div key={name} className="flex items-center gap-3">
                    <StatusDot tone={tone} ringed={ringed} label={name} />
                    <span className="text-meta text-text">{name}</span>
                    <span className="tabular text-caption text-text-3">{range}</span>
                  </div>
                ))}
                <p className="text-caption text-text-2 max-w-xs">
                  Excellent is <code>--success</code> with a ring and check, not gold — §4.1 keeps
                  semantic colour separate from the accent.
                </p>
              </div>
              <div className="space-y-3">
                <SectionLabel>Tiers</SectionLabel>
                <div className="flex gap-2">
                  <TierBadge tier="silver" />
                  <TierBadge tier="diamond" />
                </div>
              </div>
            </div>
          </Card>
        </Row>

        <Row title="Journey rail — four stage states">
          <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pt-3 pb-2">
            <div className="flex gap-4">
              {STAGE_FIXTURES.map((stage, index) => (
                <div key={stage.name} className="w-[248px] shrink-0">
                  <StageCard
                    index={index + 1}
                    name={stage.name}
                    tagline={stage.tagline}
                    wealthBand="Band pending from client"
                    icon={stage.icon}
                    tier={index > 2 ? 'diamond' : 'silver'}
                    state={stage.state}
                    progress={0.35}
                  />
                </div>
              ))}
            </div>
          </div>
        </Row>

        <Row title="Buttons">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <AppButton variant="primary">
                <Sparkles aria-hidden className="size-4" />
                Add
              </AppButton>
              <AppButton variant="outline">Edit Dashboard</AppButton>
              <AppButton variant="ghost">Details →</AppButton>
              <AppButton variant="danger">Clear everything</AppButton>
              <AppButton variant="primary" disabled>
                Disabled
              </AppButton>
              <AppButton variant="outline" size="sm">
                Small
              </AppButton>
              <AppButton variant="outline" size="icon" aria-label="Flag">
                <Flag aria-hidden className="size-4" />
              </AppButton>
            </div>
            <p className="text-caption text-text-2 mt-3">
              Every size clears 44×44 (§10.8). Tab through to see the <code>--text-2</code> focus
              outline — never a border swap (§4.6).
            </p>
          </Card>
        </Row>

        <Row title="Number field — parses through money.ts">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Amount"
                value={amount}
                onValueChange={(raw) => {
                  setAmount(raw)
                }}
                hint="Try 15k, 1.5L, 2 Cr, or something unparseable."
              />
              <div className="flex items-end">
                <AppButton
                  variant="primary"
                  onClick={() => {
                    setSheetOpen(true)
                  }}
                >
                  Open sheet
                </AppButton>
              </div>
            </div>
          </Card>
        </Row>

        <Row title="Empty, locked and loading">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <EmptyState
                icon={Inbox}
                title="No transactions yet"
                description="Add your first expense and it will show up here."
                action={
                  <AppButton variant="primary" size="sm">
                    Add expense
                  </AppButton>
                }
              />
            </Card>

            <LockedOverlay unlocks="the prepayment calculator">
              <Card>
                <CardHeader title="Prepayment calculator" />
                <div className="space-y-2">
                  <Tile>
                    <SectionLabel>Interest saved</SectionLabel>
                    <CurrencyText
                      value={432000}
                      size="title"
                      className="mt-1 block font-semibold"
                    />
                  </Tile>
                  <Tile>
                    <SectionLabel>Tenure cut</SectionLabel>
                    <p className="tabular text-title text-text mt-1 font-semibold">14 months</p>
                  </Tile>
                </div>
              </Card>
            </LockedOverlay>

            <Card>
              <CardHeader title="Loading state" />
              <div className="space-y-3">
                <Skeletons />
              </div>
              <p className="text-caption text-text-2 mt-3">
                Fixed heights, so arriving content does not shift the page (§10.7).
              </p>
            </Card>
          </div>
        </Row>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
        }}
        title="Confirm entry"
        description="§9.2 — the quick-add parser always confirms before it writes."
        footer={
          <div className="flex gap-3">
            <AppButton
              variant="primary"
              block
              onClick={() => {
                setSheetOpen(false)
              }}
            >
              Save
            </AppButton>
            <AppButton
              variant="ghost"
              block
              onClick={() => {
                setSheetOpen(false)
              }}
            >
              Cancel
            </AppButton>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-meta text-text-2">
            Scroll to the end of this panel — the page behind it does not move (
            <code>overscroll-behavior: contain</code>, §10.4), and closing restores your exact
            scroll position (§10.5).
          </p>
          <NumberField
            label="Amount"
            value={amount}
            onValueChange={(raw) => {
              setAmount(raw)
            }}
          />
          {Array.from({ length: 8 }, (_, index) => (
            <Tile key={index}>
              <p className="text-meta text-text-2">Filler row {index + 1}</p>
            </Tile>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

function Skeletons() {
  return (
    <>
      <Skeleton height={20} width="60%" />
      <Skeleton height={44} />
      <Skeleton height={44} />
    </>
  )
}
