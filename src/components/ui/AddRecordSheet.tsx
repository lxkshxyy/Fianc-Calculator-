import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { ZodType } from 'zod'

import { AppButton } from '@/components/ui/AppButton'
import { RecordForm, type FieldSpec, type FieldValues } from '@/components/ui/RecordForm'
import { Sheet } from '@/components/ui/Sheet'
import { useData } from '@/data/store/data'
import type { CollectionName } from '@/data/repo/types'

/**
 * The "Add" button every module screen needs, and the sheet behind it.
 *
 * The write goes through the data store, which goes through the repository —
 * a screen never touches storage directly (§8.1). A failed write leaves the
 * sheet open with the data still in it rather than closing over a silent loss.
 */
export function AddRecordSheet({
  collection,
  title,
  description,
  buttonLabel = 'Add',
  submitLabel,
  fields,
  schema,
  initial,
  constants,
}: {
  collection: CollectionName
  title: string
  description?: string
  buttonLabel?: string
  submitLabel: string
  fields: readonly FieldSpec[]
  schema: ZodType
  /** Starting values, for fields that should open with something sensible in them. */
  initial?: FieldValues
  /** Fields the record needs but the form does not ask for — `active: true` and the like. */
  constants?: Record<string, unknown>
}) {
  const [open, setOpen] = useState(false)
  const createRecord = useData((state) => state.create)

  return (
    <>
      <AppButton
        variant="primary"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Plus aria-hidden className="size-4" />
        {buttonLabel}
      </AppButton>

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title={title}
        description={description}
      >
        {/* Keyed so reopening starts clean rather than showing the last attempt. */}
        <RecordForm
          key={open ? 'open' : 'closed'}
          fields={fields}
          schema={schema}
          initial={initial}
          constants={constants}
          submitLabel={submitLabel}
          onCancel={() => {
            setOpen(false)
          }}
          onSubmit={async (draft) => {
            /*
             * The schema has already accepted this draft, and `create` returns
             * null only when the write itself failed. Keeping the sheet open in
             * that case means the typing is not lost.
             */
            const created = await createRecord(
              collection,
              draft as Parameters<typeof createRecord>[1],
            )
            if (created !== null) setOpen(false)
          }}
        />
      </Sheet>
    </>
  )
}
