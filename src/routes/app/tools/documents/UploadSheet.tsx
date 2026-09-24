import { KeyRound, ScanText, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Meter } from '@/components/ui/RecordList'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { hasServer } from '@/config/server'
import type { DocumentScan } from '@/data/schema'
import { todayIso } from '@/data/schema/common'
import { useData } from '@/data/store/data'
import { keepText, suggestFromText } from '@/domain/docscan'
import { imageForStorage } from '@/lib/scan/image'
import { fileFamily, MAX_UPLOAD_BYTES, previewUrl, scanFile, type ScanProgress } from '@/lib/scan'
import { DetailsEditor } from './DetailsEditor'
import { baseName, keptFields, readableSize, splitTags, type DocumentDraft } from './shared'

type Phase =
  | { step: 'reading'; progress: ScanProgress }
  | { step: 'password'; wrongPassword: boolean }
  | { step: 'review'; notice: string | null }
  | { step: 'rejected'; reason: string }
  | { step: 'saving' }

const STAGE_LINE: Record<ScanProgress['stage'], string> = {
  opening: 'Opening the file…',
  reading: 'Reading the text…',
  recognising: 'Recognising the words on the page…',
}

function rejectionFor(file: File): string | null {
  if (fileFamily(file) === 'unsupported') return 'Pick a PDF, or a photo in JPG, PNG or WebP.'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `This file is ${readableSize(file.size)}. The limit is ${readableSize(MAX_UPLOAD_BYTES)}.`
  }
  return null
}

/**
 * Upload → read → check → save, for one picked file.
 *
 * The scan runs the moment a file arrives, so by the time the person has
 * glanced at the preview the details are filled in. What they then see is a
 * form they can correct, not a result they have to accept — nothing is written
 * until they press Save, and a scan that finds nothing (or fails outright)
 * still leaves them one tap from keeping the file.
 *
 * The parent keys this by file, so every pick starts from a clean sheet rather
 * than resetting a dozen pieces of state by hand.
 */
export function UploadSheet({ file, onClose }: { file: File; onClose: () => void }) {
  const addDocument = useData((state) => state.addDocument)
  const [rejection] = useState(() => rejectionFor(file))
  const [phase, setPhase] = useState<Phase>(() =>
    rejection === null
      ? { step: 'reading', progress: { stage: 'opening', progress: 0 } }
      : { step: 'rejected', reason: rejection },
  )
  const [draft, setDraft] = useState<DocumentDraft>(() => ({
    name: baseName(file.name),
    kind: 'other',
    tags: '',
    fields: [],
  }))
  const [scan, setScan] = useState<Omit<DocumentScan, 'fields'> | null>(null)
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [shareCopy, setShareCopy] = useState(false)
  /* Bumped per scan, and on close, so a result arriving late is ignored. */
  const run = useRef(0)
  const previewRef = useRef<string | null>(null)

  function showPreview(url: string | null): void {
    if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  async function read(withPassword?: string): Promise<void> {
    const id = ++run.current
    const outcome = await scanFile(file, {
      password: withPassword,
      onProgress: (progress) => {
        if (run.current === id) setPhase({ step: 'reading', progress })
      },
    })
    if (run.current !== id) return

    if (outcome.status === 'needs-password') {
      setPhase({ step: 'password', wrongPassword: outcome.wrongPassword })
      return
    }

    /* A locked PDF had no preview until now. */
    if (withPassword !== undefined) {
      const url = await previewUrl(file, withPassword)
      if (run.current !== id) {
        if (url !== null) URL.revokeObjectURL(url)
        return
      }
      showPreview(url)
    }

    if (outcome.status === 'failed') {
      setPhase({ step: 'review', notice: outcome.reason })
      return
    }

    const suggestion = suggestFromText(outcome.text)
    setScan({ method: outcome.method, scannedAt: Date.now(), text: keepText(outcome.text) })
    setDraft({
      name: suggestion.name ?? baseName(file.name),
      kind: suggestion.kind,
      tags: suggestion.tags.join(', '),
      fields: suggestion.fields,
    })
    setPhase({
      step: 'review',
      notice:
        suggestion.fields.length === 0
          ? 'No details could be picked out of this one. Add what you need below.'
          : null,
    })
  }

  useEffect(() => {
    if (rejection !== null) return
    let live = true
    void previewUrl(file).then((url) => {
      if (live) showPreview(url)
      else if (url !== null) URL.revokeObjectURL(url)
    })
    void read()
    return () => {
      live = false
      run.current += 1
      showPreview(null)
    }
    // Runs once per mounted file; `read` and `showPreview` only touch refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, rejection])

  async function save(): Promise<void> {
    if (draft.name.trim() === '') {
      setNameError('Name is needed.')
      return
    }
    setPhase({ step: 'saving' })
    const stored = fileFamily(file) === 'image' ? await imageForStorage(file) : file
    const fields = keptFields(draft.fields)
    const created = await addDocument(stored, {
      name: draft.name.trim(),
      kind: draft.kind,
      sizeBytes: stored.size,
      uploadedOn: todayIso(),
      tags: splitTags(draft.tags),
      mimeType: stored.type !== '' ? stored.type : file.type,
      scan: scan === null ? null : { ...scan, fields },
      delivery: shareCopy ? 'queued' : 'local',
    })
    if (created === null) {
      setPhase({ step: 'review', notice: 'That did not save. Try once more.' })
      return
    }
    onClose()
  }

  const busy = phase.step === 'reading' || phase.step === 'saving'

  return (
    <Sheet
      open
      onClose={() => {
        if (phase.step !== 'saving') onClose()
      }}
      title="Add a document"
      description={`${file.name} · ${readableSize(file.size)}`}
      footer={
        phase.step === 'rejected' ? (
          <AppButton block onClick={onClose}>
            Close
          </AppButton>
        ) : (
          <div className="flex gap-2">
            <AppButton
              variant="primary"
              className="flex-1"
              disabled={busy || phase.step === 'password'}
              onClick={() => void save()}
            >
              {phase.step === 'saving' ? 'Saving…' : 'Save document'}
            </AppButton>
            <AppButton variant="ghost" disabled={phase.step === 'saving'} onClick={onClose}>
              Cancel
            </AppButton>
          </div>
        )
      }
    >
      {preview === null ? null : (
        <div className="rounded-tile bg-surface-2 mb-4 flex justify-center overflow-hidden">
          <img
            src={preview}
            alt={`Preview of ${file.name}`}
            className="max-h-56 w-auto object-contain"
          />
        </div>
      )}

      {phase.step === 'reading' ? (
        <div role="status" aria-live="polite" className="rounded-tile bg-surface-2 p-4">
          <div className="flex items-center gap-2.5">
            <ScanText aria-hidden className="text-gold size-5 shrink-0 animate-pulse" />
            <p className="text-meta text-text font-medium">
              {STAGE_LINE[phase.progress.stage]}
              {phase.progress.detail === undefined ? '' : ` ${phase.progress.detail}`}
            </p>
          </div>
          <div className="mt-3">
            <Meter value={phase.progress.progress} />
          </div>
          <p className="text-caption text-text-2 mt-2">
            Read on your phone — the file does not go anywhere. The first scan takes a few seconds
            longer.
          </p>
        </div>
      ) : null}

      {phase.step === 'rejected' ? <Notice tone="warn" text={phase.reason} /> : null}

      {phase.step === 'password' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (password === '') return
            setPhase({ step: 'reading', progress: { stage: 'opening', progress: 0 } })
            void read(password)
          }}
          className="rounded-tile bg-surface-2 p-4"
        >
          <div className="mb-3 flex items-start gap-2.5">
            <KeyRound aria-hidden className="text-gold mt-0.5 size-5 shrink-0" />
            <p className="text-meta text-text-2">
              This PDF is locked. Bank and fund statements usually use your PAN or date of birth as
              the password. It is used once, to read the file, and not stored.
            </p>
          </div>
          <TextField
            label="PDF password"
            type="password"
            autoComplete="off"
            value={password}
            error={phase.wrongPassword ? 'That password did not open it.' : undefined}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" variant="primary" disabled={password === ''}>
              Unlock and read
            </AppButton>
            <AppButton
              variant="ghost"
              onClick={() => {
                setPhase({ step: 'review', notice: 'Saved without reading. Add details below.' })
              }}
            >
              Skip reading
            </AppButton>
          </div>
        </form>
      ) : null}

      {phase.step === 'review' || phase.step === 'saving' ? (
        <div className="space-y-3">
          {phase.step === 'review' && phase.notice !== null ? (
            <Notice tone="warn" text={phase.notice} />
          ) : null}
          {phase.step === 'review' && phase.notice === null && draft.fields.length > 0 ? (
            <Notice
              tone="ok"
              text={`Found ${String(draft.fields.length)} details. Check them before saving.`}
            />
          ) : null}
          <DetailsEditor
            draft={draft}
            nameError={nameError}
            onChange={(next) => {
              setDraft(next)
              if (next.name.trim() !== '') setNameError(undefined)
            }}
          />
          {hasServer() ? (
            <label className="rounded-tile bg-surface-2 flex items-start gap-3 p-3">
              <input
                type="checkbox"
                checked={shareCopy}
                onChange={(event) => {
                  setShareCopy(event.target.checked)
                }}
                className="accent-gold mt-0.5 size-5 shrink-0"
              />
              <span className="text-meta text-text-2">
                <span className="text-text font-medium">Send a copy to the WRC team</span> so your
                advisor can see it. Leave this off to keep it on your phone only.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  )
}

function Notice({ tone, text }: { tone: 'ok' | 'warn'; text: string }) {
  return (
    <p
      className={
        'rounded-tile text-meta flex items-start gap-2 p-3 ' +
        (tone === 'ok' ? 'bg-success/10 text-text' : 'bg-warn/10 text-text')
      }
    >
      {tone === 'warn' ? (
        <TriangleAlert aria-hidden className="text-warn mt-0.5 size-4 shrink-0" />
      ) : (
        <ScanText aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
      )}
      {text}
    </p>
  )
}
