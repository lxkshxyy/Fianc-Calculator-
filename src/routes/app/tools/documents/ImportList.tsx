import { SectionLabel } from '@/components/ui/SectionLabel'
import type { ImportItem } from '@/domain/docimport'
import { SECTION } from './shared'

/**
 * What a scanned document will add to the rest of the app, one tick box per
 * record. Everything starts ticked — the point is that a statement fills the
 * app without retyping — but each line says where it goes and whether it adds
 * a record or updates one already there, so nothing lands by surprise.
 */
export function ImportList({
  items,
  skipped,
  onToggle,
}: {
  items: ImportItem[]
  skipped: ReadonlySet<string>
  onToggle: (key: string) => void
}) {
  if (items.length === 0) return null
  return (
    <section aria-label="Add to your app" className="rounded-tile bg-surface-2 p-3">
      <SectionLabel>Add to your app</SectionLabel>
      <p className="text-caption text-text-2 mt-1">
        Ticked lines are added when you save. Untick anything you do not want.
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const section = SECTION[item.section]
          const Icon = section.icon
          return (
            <li key={item.key}>
              <label className="rounded-tile hover:bg-surface flex cursor-pointer items-start gap-3 p-2">
                <input
                  type="checkbox"
                  checked={!skipped.has(item.key)}
                  onChange={() => {
                    onToggle(item.key)
                  }}
                  className="accent-gold mt-0.5 size-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="text-caption text-gold flex items-center gap-1.5 font-semibold">
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {section.label} · {item.updates ? 'updates' : 'new'}
                  </span>
                  <span className="text-meta text-text block font-medium break-words">
                    {item.title}
                  </span>
                  <span className="text-caption text-text-2 block break-words">{item.detail}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
