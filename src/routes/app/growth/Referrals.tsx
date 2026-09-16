import { Check, Copy, Gift } from 'lucide-react'
import { useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { useProfile, useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const STATUS_LABEL: Record<string, string> = {
  invited: 'Invited',
  'signed-up': 'Signed up',
  subscribed: 'Subscribed',
}

export function Referrals() {
  const snapshot = useSnapshot()
  const profile = useProfile()
  const [copied, setCopied] = useState(false)
  if (snapshot === null || profile === null) return null

  const code = profile.id.slice(-8).toUpperCase()
  const link = `${globalThis.location.origin}/?ref=${code}`
  const earned = snapshot.referrals.reduce((total, entry) => total + entry.rewardEarned, 0)

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      globalThis.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      /* Clipboard access can be refused; the link is selectable on screen regardless. */
      setCopied(false)
    }
  }

  return (
    <ModuleScreen
      title="Refer & Earn"
      subtitle="Share your link. You earn when someone you invited subscribes."
      icon={Gift}
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricTile
            label="People invited"
            icon={Gift}
            value={<span className="text-title tabular-nums">{snapshot.referrals.length}</span>}
          />
          <MetricTile
            label="Rewards earned"
            icon={Gift}
            value={<CurrencyText value={earned} size="title" tone="inherit" />}
          />
        </div>
      }
    >
      <ModuleSection label="Your link">
        <Card>
          <p className="rounded-tile bg-surface-2 text-caption text-text-2 p-3 font-mono break-all">
            {link}
          </p>
          <div className="mt-3">
            <AppButton
              onClick={() => {
                void copy()
              }}
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </AppButton>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label="People you invited">
        <RecordList
          rows={snapshot.referrals.map((entry) => ({
            id: entry.id,
            icon: Gift,
            title: entry.name,
            subtitle: `${STATUS_LABEL[entry.status] ?? entry.status} · ${entry.invitedOn}`,
            value: <CurrencyText value={entry.rewardEarned} size="body" tone="inherit" />,
          }))}
          empty={{
            icon: Gift,
            title: 'Nobody yet',
            description: 'Share your link and anyone who joins shows up here.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
