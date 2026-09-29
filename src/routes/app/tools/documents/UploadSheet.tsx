import { ArrowRight, FileX2, KeyRound, RotateCcw, ScanText, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Meter } from '@/components/ui/RecordList'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { hasServer } from '@/config/server'
import type { DocumentScan } from '@/data/schema'
import { todayIso } from '@/data/schema/common'
import { useData, useSnapshot } from '@/data/store/data'
import { planImport, type ImportItem } from '@/domain/docimport'
import { keepText, looksFinancial, suggestFromText } from '@/domain/docscan'
import { imageForStorage } from '@/lib/scan/image'
import { fileFamily, MAX_UPLOAD_BYTES, previewUrl, scanFile, type ScanProgress } from '@/lib/scan'
import { DetailsEditor } from './DetailsEditor'
import { ImportList } from './ImportList'
import {
  baseName,
  keptFields,
  readableSize,
  SECTION,
  splitTags,
  type DocumentDraft,
} from './shared'

type Phase =
  | { step: 'reading'; progress: ScanProgress }
  | { step: 'password'; wrongPassword: boolean }
  | { step: 'review'; notice: string | null }
  /** Not a file this screen holds at all — a Word file, or over the size limit. */
  | { step: 'rejected'; reason: string }
  /** Read, but not money paperwork. */
  | { step: 'not-financial' }
  /** Could not be read. `retry` when the reader itself failed to load. */
  | { step: 'failed'; reason: string; retry: boolean }
  | { step: 'saving' }
  | { step: 'done'; added: ImportItem[]; missed: number }

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
 * The scan runs the moment a file arrives and reads the whole document. Then
 * two things happen before anything can be saved:
 *
 * - **It has to be financial.** Documents holds money paperwork — policies,
 *   statements, salary slips, tax forms, loan letters, receipts, and the ID and
 *   will papers that go with them. A photo or PDF of anything else is turned
 *   away with a plain reason (docscan.ts `looksFinancial`), rather than saved
 *   into the vault as "Other".
 * - **What it says is put to use.** The figures it carries become records in
 *   the rest of the app — a policy on Insurance, a salary on Income, holdings on
 *   Investments, a loan on EMI & Credit, income and deductions on Tax Planning,
 *   a month's spending on Budget (docimport.ts). The person sees each line, can
 *   untick any, and corrects the details first; nothing is written until Save.
 *
 * The parent keys this by file, so every pick starts from a clean sheet rather
 * than resetting a dozen pieces of state by hand.
 */
export function UploadSheet({
  file,
  onClose,
  onChooseAnother,
}: {
  file: File
  onClose: () => void
  /** Opens the file picker again, for when this file was the wrong one. */
  onChooseAnother?: () => void
}) {
  const addDocument = useData((state) => state.addDocument)
  const applyImport = useData((state) => state.applyImport)
  const snapshot = useSnapshot()
  const navigate = useNavigate()
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
  /* The whole text, for the import plan — the record keeps only a capped copy. */
  const [fullText, setFullText] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set())
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [shareCopy, setShareCopy] = useState(false)
  /* Bumped per scan, and on close, so a result arriving late is ignored. */
  const run = useRef(0)
  const previewRef = useRef<string | null>(null)

  /* Recomputed as the details are corrected, so a fixed figure is the one imported. */
  const plan = useMemo(
    () =>
      fullText === null || snapshot === null
        ? []
        : planImport(
            { text: fullText, kind: draft.kind, fields: draft.fields, today: todayIso() },
            snapshot,
          ),
    [fullText, draft.kind, draft.fields, snapshot],
  )
  const chosen = plan.filter((item) => !skipped.has(item.key))

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
      setPhase({ step: 'failed', reason: outcome.reason, retry: outcome.retry })
      return
    }

    const suggestion = suggestFromText(outcome.text)
    if (!looksFinancial(outcome.text, suggestion)) {
      setPhase({ step: 'not-financial' })
      return
    }
    setScan({ method: outcome.method, scannedAt: Date.now(), text: keepText(outcome.text) })
    setFullText(outcome.text)
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
      /* Filled in by applyImport, once the records it lists exist. */
      imported: [],
    })
    if (created === null) {
      setPhase({ step: 'review', notice: 'That did not save. Try once more.' })
      return
    }
    const actions = chosen.flatMap((item) => item.actions)
    const written = actions.length === 0 ? 0 : await applyImport(created.id, actions)
    setPhase({ step: 'done', added: chosen, missed: actions.length - written })
  }

  /** Reads again from the start — after a password, or when the reader failed to load. */
  function reread(withPassword?: string): void {
    setPhase({ step: 'reading', progress: { stage: 'opening', progress: 0 } })
    void read(withPassword)
  }

  function open(path: string): void {
    onClose()
    void navigate(path)
  }

  const busy = phase.step === 'reading' || phase.step === 'saving'

  let footer: React.ReactNode
  if (phase.step === 'done') {
    footer = (
      <AppButton block variant="primary" onClick={onClose}>
        Done
      </AppButton>
    )
  } else if (phase.step === 'rejected' || phase.step === 'not-financial') {
    footer = (
      <div className="flex gap-2">
        {onChooseAnother === undefined ? null : (
          <AppButton variant="primary" className="flex-1" onClick={onChooseAnother}>
            Choose another file
          </AppButton>
        )}
        <AppButton
          variant="ghost"
          className={onChooseAnother === undefined ? 'flex-1' : undefined}
          onClick={onClose}
        >
          Close
        </AppButton>
      </div>
    )
  } else if (phase.step === 'failed') {
    footer = (
      <div className="flex gap-2">
        {phase.retry ? (
          <AppButton
            variant="primary"
            className="flex-1"
            onClick={() => {
              reread(password === '' ? undefined : password)
            }}
          >
            <RotateCcw aria-hidden className="size-4" />
            Try again
          </AppButton>
        ) : null}
        <AppButton variant="ghost" className={phase.retry ? undefined : 'flex-1'} onClick={onClose}>
          Close
        </AppButton>
      </div>
    )
  } else {
    footer = (
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

  return (
    <Sheet
      open
      onClose={() => {
        if (phase.step !== 'saving') onClose()
      }}
      title="Add a document"
      description={`${file.name} · ${readableSize(file.size)}`}
      footer={footer}
    >
      {preview === null || phase.step === 'done' ? null : (
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
            Read on your device, every page — the file does not go anywhere. The first scan takes a
            few seconds longer.
          </p>
        </div>
      ) : null}

      {phase.step === 'rejected' ? <Notice tone="warn" text={phase.reason} /> : null}

      {phase.step === 'failed' ? <Notice tone="warn" text={phase.reason} /> : null}

      {phase.step === 'not-financial' ? (
        <div role="alert" className="rounded-tile bg-warn/10 p-4">
          <div className="flex items-start gap-2.5">
            <FileX2 aria-hidden className="text-warn mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-meta text-text font-semibold">This is not a financial document</p>
              <p className="text-meta text-text-2 mt-1">
                Documents keeps money paperwork: insurance policies and premium receipts, bank and
                investment statements, salary slips, Form 16 and other tax papers, loan letters, and
                ID proofs. Nothing like that could be found in this file, so it was not saved.
              </p>
              <p className="text-caption text-text-2 mt-2">
                If it is one of those, try the PDF itself, or a sharper photo taken flat and in good
                light.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {phase.step === 'password' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (password === '') return
            reread(password)
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
          <AppButton type="submit" variant="primary" disabled={password === ''}>
            Unlock and read
          </AppButton>
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
          <ImportList
            items={plan}
            skipped={skipped}
            onToggle={(key) => {
              setSkipped((current) => {
                const next = new Set(current)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
            }}
          />
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

      {phase.step === 'done' ? (
        <div className="space-y-3">
          <Notice tone="ok" text="Saved to Documents." />
          {phase.missed > 0 ? (
            <Notice
              tone="warn"
              text={`${String(phase.missed)} of the records could not be added. Add them by hand from their section.`}
            />
          ) : null}
          {phase.added.length === 0 ? null : (
            <section aria-label="Added to your app" className="rounded-tile bg-surface-2 p-3">
              <p className="text-meta text-text font-semibold">Added to your app</p>
              <ul className="mt-2 space-y-2">
                {phase.added.map((item) => {
                  const section = SECTION[item.section]
                  const Icon = section.icon
                  return (
                    <li key={item.key} className="flex items-start gap-3">
                      <Icon aria-hidden className="text-gold mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="text-meta text-text block font-medium break-words">
                          {item.title}
                        </span>
                        <span className="text-caption text-text-2 block break-words">
                          {item.updates ? 'Updated' : 'Added'} in {section.label}
                        </span>
                      </span>
                      <AppButton
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          open(section.path)
                        }}
                      >
                        Open
                        <ArrowRight aria-hidden className="size-3.5" />
                      </AppButton>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
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
