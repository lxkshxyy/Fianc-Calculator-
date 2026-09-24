import { Plus, X } from 'lucide-react'

import { SelectField } from '@/components/ui/RecordForm'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { TextField } from '@/components/ui/TextField'
import type { DocumentKind } from '@/data/schema'
import { newId } from '@/data/schema/common'
import { KIND_OPTIONS, type DocumentDraft } from './shared'

/**
 * Name, type, tags and the details read off the page — the same editor when a
 * document is first saved and when it is corrected later.
 *
 * Every detail the scan found is shown as an ordinary text box. OCR is good,
 * not perfect, and the person holding the paper is the authority: a wrong digit
 * in a policy number is fixed here in one tap rather than living on in the
 * record. Details the scan missed can be added by hand, label and all.
 */
export function DetailsEditor({
  draft,
  onChange,
  nameError,
}: {
  draft: DocumentDraft
  onChange: (next: DocumentDraft) => void
  nameError?: string
}) {
  function patch(next: Partial<DocumentDraft>): void {
    onChange({ ...draft, ...next })
  }

  function setField(index: number, next: { label?: string; value?: string }): void {
    patch({
      fields: draft.fields.map((field, at) => (at === index ? { ...field, ...next } : field)),
    })
  }

  return (
    <div>
      <TextField
        label="Name"
        value={draft.name}
        error={nameError}
        onChange={(event) => {
          patch({ name: event.target.value })
        }}
      />
      <SelectField
        label="Type"
        value={draft.kind}
        options={KIND_OPTIONS}
        onChange={(value) => {
          patch({ kind: value as DocumentKind })
        }}
      />
      <TextField
        label="Tags"
        value={draft.tags}
        hint="Separate with commas — they make it easy to find."
        placeholder="term, hdfc life"
        onChange={(event) => {
          patch({ tags: event.target.value })
        }}
      />

      <div className="mt-1 flex items-center justify-between gap-3">
        <SectionLabel>Details</SectionLabel>
        <span className="text-caption text-text-3">
          {draft.fields.length === 0
            ? 'None yet'
            : `${String(draft.fields.length)} ${draft.fields.length === 1 ? 'detail' : 'details'}`}
        </span>
      </div>

      <ul className="mt-2 space-y-2">
        {draft.fields.map((field, index) => {
          const custom = field.key.startsWith('custom')
          return (
            <li key={field.key} className="rounded-tile bg-surface-2 flex items-start gap-2 p-2.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                {custom ? (
                  <input
                    aria-label="Detail name"
                    value={field.label}
                    placeholder="What is it? e.g. Agent"
                    onChange={(event) => {
                      setField(index, { label: event.target.value })
                    }}
                    className="text-caption text-text-2 placeholder:text-text-3 w-full bg-transparent font-medium outline-none"
                  />
                ) : (
                  <p className="text-caption text-text-2 font-medium">{field.label}</p>
                )}
                <input
                  aria-label={field.label === '' ? 'Detail value' : field.label}
                  value={field.value}
                  onChange={(event) => {
                    setField(index, { value: event.target.value })
                  }}
                  className="rounded-button border-border bg-surface text-body text-text hover:border-border-strong min-h-10 w-full border px-3"
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ${field.label === '' ? 'this detail' : field.label}`}
                onClick={() => {
                  patch({ fields: draft.fields.filter((_, at) => at !== index) })
                }}
                className="rounded-tile text-text-3 hover:text-danger flex size-10 shrink-0 items-center justify-center"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => {
          patch({ fields: [...draft.fields, { key: newId('custom'), label: '', value: '' }] })
        }}
        className="rounded-button text-meta text-gold hover:bg-surface-2 mt-2 inline-flex min-h-11 items-center gap-1.5 px-2 font-medium"
      >
        <Plus aria-hidden className="size-4" />
        Add a detail
      </button>
    </div>
  )
}
