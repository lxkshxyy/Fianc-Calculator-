import { Landmark, ShieldCheck } from 'lucide-react'

import { AddRecordSheet } from '@/components/ui/AddRecordSheet'
import { ASSET_FIELDS, AssetDraftForm } from '../addForms'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { isLiquid } from '@/data/schema'
import { useData, useDerived, useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function Assets() {
  const snapshot = useSnapshot()
  const derived = useDerived()
  /*
   * One asset out, the rest untouched. The repository has had `remove` since the
   * beginning; until now nothing on screen reached it, so correcting a single
   * wrong entry meant Settings → delete everything and start again.
   */
  const removeRecord = useData((state) => state.remove)
  if (snapshot === null || derived === null) return null

  const withoutNominee = snapshot.assets.filter((asset) => asset.nominee === null)

  return (
    <ModuleScreen
      title="Assets"
      subtitle="Everything you own. This is one half of your net worth."
      icon={Landmark}
      moduleId="assets"
      action={
        <AddRecordSheet
          collection="assets"
          title="Add an asset"
          description="Anything you own that has value — accounts, gold, property, a vehicle."
          buttonLabel="Add asset"
          submitLabel="Save asset"
          fields={ASSET_FIELDS}
          schema={AssetDraftForm}
        />
      }
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Total assets"
            icon={Landmark}
            value={<CurrencyText value={derived.assetsTotal} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Reachable today"
            icon={Landmark}
            value={<CurrencyText value={derived.liquidAssets} size="title" tone="inherit" />}
          />
          <MetricTile
            label="Net worth"
            icon={Landmark}
            value={<CurrencyText value={derived.netWorth} size="title" />}
          />
        </div>
      }
    >
      <ModuleSection label="What you own">
        <RecordList
          rows={snapshot.assets.map((asset) => ({
            id: asset.id,
            icon: Landmark,
            title: asset.name,
            subtitle: `${asset.kind.replace('-', ' ')}${isLiquid(asset) ? ' · reachable today' : ''}`,
            value: <CurrencyText value={asset.value} size="body" tone="inherit" />,
            meta: asset.nominee === null ? 'No nominee' : `Nominee: ${asset.nominee}`,
            deleteLabel: asset.name,
          }))}
          onDelete={(id) => {
            void removeRecord('assets', id)
          }}
          empty={{
            icon: Landmark,
            title: 'Nothing recorded',
            description: 'Add a bank balance or a property and your net worth starts working.',
          }}
        />
      </ModuleSection>

      {withoutNominee.length === 0 ? null : (
        <ModuleSection label="Missing a nominee">
          <RecordList
            rows={withoutNominee.map((asset) => ({
              id: `nom-${asset.id}`,
              icon: ShieldCheck,
              title: asset.name,
              subtitle: 'No nominee named',
            }))}
            empty={{ icon: ShieldCheck, title: '', description: '' }}
          />
        </ModuleSection>
      )}
    </ModuleScreen>
  )
}
