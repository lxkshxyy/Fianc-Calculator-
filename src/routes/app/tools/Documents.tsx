import { FileText, Search } from 'lucide-react'
import { useState } from 'react'

import { RecordList } from '@/components/ui/RecordList'
import { useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`
}

export function Documents() {
  const snapshot = useSnapshot()
  const [query, setQuery] = useState('')
  if (snapshot === null) return null

  const needle = query.trim().toLowerCase()
  const matches = snapshot.documents.filter(
    (document) =>
      needle === '' ||
      document.name.toLowerCase().includes(needle) ||
      document.tags.some((tag) => tag.toLowerCase().includes(needle)),
  )

  return (
    <ModuleScreen
      title="Documents"
      subtitle="Policies, receipts and statements, in one place you can actually find them."
      icon={FileText}
    >
      <ModuleSection label="Search">
        <div className="relative max-w-md">
          <Search
            aria-hidden
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-text-3"
          />
          <input
            id="document-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            aria-label="Search documents"
            placeholder="Search by name or tag"
            className="h-11 w-full rounded-tile border border-border bg-surface pr-3 pl-9 text-sm text-text placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-text-2 focus-visible:outline-offset-2"
          />
        </div>
      </ModuleSection>

      <ModuleSection label="Files">
        <RecordList
          rows={matches.map((document) => ({
            id: document.id,
            icon: FileText,
            title: document.name,
            subtitle: `${document.kind.replace('-', ' ')} · ${document.uploadedOn}`,
            meta: readableSize(document.sizeBytes),
          }))}
          empty={{
            icon: FileText,
            title: needle === '' ? 'No documents yet' : 'Nothing matched',
            description:
              needle === ''
                ? 'Keep your policy schedules and receipts here so a claim is not a scramble.'
                : 'Try a different word, or clear the search.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
