import {
  Camera,
  FileText,
  FolderOpen,
  HardDrive,
  type LucideIcon,
  ScanText,
  Search,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { RecordList } from '@/components/ui/RecordList'
import { useData, useSnapshot } from '@/data/store/data'
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from '@/lib/scan'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'
import { DocumentSheet } from './documents/DocumentSheet'
import { KIND_ICON, KIND_LABEL, readableDate, readableSize } from './documents/shared'
import { UploadSheet } from './documents/UploadSheet'

/**
 * Policies, receipts and statements — uploaded, read on the phone, and found
 * again by anything they say.
 *
 * Two ways in, because there are two situations: the paper is in your hand
 * (camera), or the PDF is already on the phone (file). Both land in the same
 * upload sheet, which reads the document and pre-fills its details.
 */
export function Documents() {
  const snapshot = useSnapshot()
  const removeDocument = useData((state) => state.removeDocument)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<{ file: File; key: number } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  if (snapshot === null) return null

  const needle = query.trim().toLowerCase()
  const matches = snapshot.documents
    .filter((document) => {
      if (needle === '') return true
      return (
        document.name.toLowerCase().includes(needle) ||
        document.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        KIND_LABEL[document.kind].toLowerCase().includes(needle) ||
        (document.scan?.fields.some((field) => field.value.toLowerCase().includes(needle)) ??
          false) ||
        (document.scan?.text.toLowerCase().includes(needle) ?? false)
      )
    })
    .sort((a, b) => b.createdAt - a.createdAt)

  const scanned = snapshot.documents.filter((document) => document.scan !== null).length
  const storedBytes = snapshot.documents
    .filter((document) => document.fileId !== null)
    .reduce((total, document) => total + document.sizeBytes, 0)
  const open = openId === null ? undefined : snapshot.documents.find((d) => d.id === openId)

  function onPick(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    /* Cleared so picking the same file twice still fires a change. */
    event.target.value = ''
    if (file !== undefined) setPicked({ file, key: Date.now() })
  }

  return (
    <ModuleScreen
      title="Documents"
      subtitle="Policies, receipts and statements, in one place you can actually find them."
      icon={FileText}
      summary={
        <dl className="rounded-card border-border bg-surface divide-border grid grid-cols-3 divide-x border">
          <Stat icon={FileText} label="Files" value={String(snapshot.documents.length)} />
          <Stat icon={ScanText} label="Read" value={String(scanned)} />
          <Stat icon={HardDrive} label="On phone" value={readableSize(storedBytes)} />
        </dl>
      }
    >
      {/* Hidden pickers. `capture` asks Android for the camera directly. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
      />
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
      />

      <section
        aria-label="Add a document"
        className="rounded-card border-gold-dim bg-surface border border-dashed p-5 text-center"
      >
        <span className="bg-gold/12 text-gold mx-auto flex size-12 items-center justify-center rounded-full">
          <ScanText aria-hidden className="size-6" />
        </span>
        <h2 className="text-body text-text mt-3 font-semibold">Add a document</h2>
        <p className="text-meta text-text-2 mx-auto mt-1 max-w-sm">
          Photograph a paper, or pick a PDF. It is read on your phone and the policy number, amounts
          and dates are filled in for you.
        </p>
        {/* Stacked on a phone, where each needs the full width for its label. */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
          <AppButton
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => {
              cameraInput.current?.click()
            }}
          >
            <Camera aria-hidden className="size-4" />
            Take photo
          </AppButton>
          <AppButton
            className="whitespace-nowrap"
            onClick={() => {
              fileInput.current?.click()
            }}
          >
            <FolderOpen aria-hidden className="size-4" />
            Choose file
          </AppButton>
        </div>
        <p className="text-caption text-text-3 mt-3">
          PDF, JPG, PNG or WebP · up to {readableSize(MAX_UPLOAD_BYTES)} · stays on this phone
        </p>
      </section>

      <ModuleSection label="Search">
        <div className="relative max-w-md">
          <Search
            aria-hidden
            className="text-text-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <input
            id="document-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            aria-label="Search documents"
            placeholder="Search by name, tag or anything in it"
            className="rounded-tile border-border bg-surface text-text placeholder:text-text-3 focus-visible:outline-text-2 h-11 w-full border pr-3 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
      </ModuleSection>

      <ModuleSection label="Files">
        <RecordList
          rows={matches.map((document) => {
            const found = document.scan?.fields.length ?? 0
            return {
              id: document.id,
              icon: KIND_ICON[document.kind],
              title: document.name,
              subtitle: `${KIND_LABEL[document.kind]} · ${readableDate(document.uploadedOn)}`,
              meta: (
                <>
                  {readableSize(document.sizeBytes)}
                  {found === 0 ? null : (
                    <span className="text-gold block">
                      {found} {found === 1 ? 'detail' : 'details'}
                    </span>
                  )}
                </>
              ),
              deleteLabel: document.name,
            }
          })}
          onSelect={setOpenId}
          onDelete={(id) => {
            if (openId === id) setOpenId(null)
            void removeDocument(id)
          }}
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

      {picked === null ? null : (
        <UploadSheet
          key={picked.key}
          file={picked.file}
          onClose={() => {
            setPicked(null)
          }}
        />
      )}

      {open === undefined ? null : (
        <DocumentSheet
          key={open.id}
          record={open}
          onClose={() => {
            setOpenId(null)
          }}
        />
      )}
    </ModuleScreen>
  )
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
      <dt className="text-caption text-text-2 flex items-center gap-1.5">
        <Icon aria-hidden className="text-gold size-3.5" />
        {label}
      </dt>
      <dd className="text-lead text-text tabular font-semibold">{value}</dd>
    </div>
  )
}
