import { FileText, Pencil, ScanText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Meter } from '@/components/ui/RecordList'
import { Sheet } from '@/components/ui/Sheet'
import type { DocumentRecord } from '@/data/schema'
import { readDocumentFile, useData } from '@/data/store/data'
import { keepText, suggestFromText } from '@/domain/docscan'
import { previewUrl, scanFile } from '@/lib/scan'
import { DetailsEditor } from './DetailsEditor'
import {
  KIND_LABEL,
  keptFields,
  readableDate,
  readableSize,
  splitTags,
  type DocumentDraft,
} from './shared'

function draftOf(record: DocumentRecord): DocumentDraft {
  return {
    name: record.name,
    kind: record.kind,
    tags: record.tags.join(', '),
    fields: record.scan?.fields ?? [],
  }
}

/**
 * One document: what it looks like, what was read off it, and a way to fix
 * either the details or the filing.
 *
 * The file is fetched only when this opens — records never carry their bytes
 * (see the repository). A document saved without reading (a skipped password,
 * a scan that failed) can be read from here later.
 */
export function DocumentSheet({
  record,
  onClose,
}: {
  record: DocumentRecord
  onClose: () => void
}) {
  const update = useData((state) => state.update)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<'loading' | 'ready' | 'none'>(
    record.fileId === null ? 'none' : 'loading',
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DocumentDraft>(() => draftOf(record))
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [reading, setReading] = useState<number | null>(null)
  const [readNote, setReadNote] = useState<string | null>(null)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    let url: string | null = null
    if (record.fileId !== null) {
      void readDocumentFile(record.fileId)
        .then((blob) => (blob === null ? null : previewUrl(blob)))
        .then((made) => {
          if (!live.current) {
            if (made !== null) URL.revokeObjectURL(made)
            return
          }
          url = made
          setPreview(made)
          setPreviewState(made === null ? 'none' : 'ready')
        })
    }
    return () => {
      live.current = false
      if (url !== null) URL.revokeObjectURL(url)
    }
  }, [record.fileId])

  async function readNow(): Promise<void> {
    if (record.fileId === null) return
    const blob = await readDocumentFile(record.fileId)
    if (blob === null) {
      setReadNote('The file could not be found on this phone.')
      return
    }
    setReading(0)
    setReadNote(null)
    const outcome = await scanFile(blob, {
      onProgress: (progress) => {
        if (live.current) setReading(progress.progress)
      },
    })
    if (!live.current) return
    setReading(null)
    if (outcome.status === 'needs-password') {
      setReadNote('This PDF is locked. Upload it again to enter its password.')
      return
    }
    if (outcome.status === 'failed') {
      setReadNote(outcome.reason)
      return
    }
    const suggestion = suggestFromText(outcome.text)
    await update('documents', record.id, {
      scan: {
        method: outcome.method,
        scannedAt: Date.now(),
        text: keepText(outcome.text),
        fields: suggestion.fields,
      },
      kind: record.kind === 'other' ? suggestion.kind : record.kind,
    })
    setDraft({ ...draftOf(record), fields: suggestion.fields })
    setEditing(true)
  }

  async function save(): Promise<void> {
    if (draft.name.trim() === '') {
      setNameError('Name is needed.')
      return
    }
    const fields = keptFields(draft.fields)
    await update('documents', record.id, {
      name: draft.name.trim(),
      kind: draft.kind,
      tags: splitTags(draft.tags),
      scan:
        record.scan === null && fields.length === 0
          ? null
          : {
              method: record.scan?.method ?? 'ocr',
              scannedAt: record.scan?.scannedAt ?? Date.now(),
              text: record.scan?.text ?? '',
              fields,
            },
    })
    setEditing(false)
  }

  const fields = record.scan?.fields ?? []

  return (
    <Sheet
      open
      onClose={onClose}
      title={record.name}
      description={`${KIND_LABEL[record.kind]} · ${readableDate(record.uploadedOn)} · ${readableSize(record.sizeBytes)}`}
      footer={
        editing ? (
          <div className="flex gap-2">
            <AppButton variant="primary" className="flex-1" onClick={() => void save()}>
              Save changes
            </AppButton>
            <AppButton
              variant="ghost"
              onClick={() => {
                setDraft(draftOf(record))
                setEditing(false)
              }}
            >
              Cancel
            </AppButton>
          </div>
        ) : (
          <div className="flex gap-2">
            <AppButton
              className="flex-1"
              onClick={() => {
                setDraft(draftOf(record))
                setEditing(true)
              }}
            >
              <Pencil aria-hidden className="size-4" />
              Edit details
            </AppButton>
            <AppButton variant="ghost" onClick={onClose}>
              Done
            </AppButton>
          </div>
        )
      }
    >
      <div className="rounded-tile bg-surface-2 mb-4 flex min-h-32 items-center justify-center overflow-hidden">
        {previewState === 'ready' && preview !== null ? (
          <img
            src={preview}
            alt={`Preview of ${record.name}`}
            className="max-h-72 w-auto object-contain"
          />
        ) : (
          <div className="text-text-3 flex flex-col items-center gap-2 p-6 text-center">
            <FileText aria-hidden className="size-8" />
            <p className="text-caption">
              {previewState === 'loading'
                ? 'Loading preview…'
                : record.fileId === null
                  ? 'Only the details are stored for this one — no file.'
                  : 'No preview for this file.'}
            </p>
          </div>
        )}
      </div>

      {editing ? (
        <DetailsEditor
          draft={draft}
          nameError={nameError}
          onChange={(next) => {
            setDraft(next)
            if (next.name.trim() !== '') setNameError(undefined)
          }}
        />
      ) : (
        <>
          {record.tags.length === 0 ? null : (
            <ul className="mb-4 flex flex-wrap gap-1.5" aria-label="Tags">
              {record.tags.map((tag) => (
                <li
                  key={tag}
                  className="border-border text-caption text-text-2 rounded-full border px-2.5 py-0.5"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          {fields.length > 0 ? (
            <dl className="divide-border rounded-tile border-border divide-y border">
              {fields.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-4 px-3 py-2.5">
                  <dt className="text-caption text-text-2 shrink-0 pt-0.5">{field.label}</dt>
                  <dd className="text-meta text-text text-right font-medium break-words">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="rounded-tile bg-surface-2 p-4">
              <p className="text-meta text-text font-medium">No details read yet</p>
              <p className="text-caption text-text-2 mt-1">
                Read it now and the policy number, amounts and dates are filled in for you.
              </p>
              {reading !== null ? (
                <div className="mt-3" role="status" aria-live="polite">
                  <Meter value={reading} />
                  <p className="text-caption text-text-2 mt-1.5">Reading on your phone…</p>
                </div>
              ) : record.fileId === null ? null : (
                <AppButton size="sm" className="mt-3" onClick={() => void readNow()}>
                  <ScanText aria-hidden className="size-4" />
                  Read this document
                </AppButton>
              )}
              {readNote === null ? null : <p className="text-caption text-warn mt-2">{readNote}</p>}
            </div>
          )}

          {record.scan === null ? null : (
            <p className="text-caption text-text-3 mt-3">
              {record.scan.method === 'pdf-text'
                ? 'Read from the PDF’s own text on this phone.'
                : 'Read from the image on this phone. Check anything that matters.'}
            </p>
          )}
        </>
      )}
    </Sheet>
  )
}
