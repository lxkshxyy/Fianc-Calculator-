import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { NumberField } from '@/components/ui/NumberField'
import { Sheet } from '@/components/ui/Sheet'
import { useData, useSnapshot } from '@/data/store/data'
import type { TransactionKind } from '@/data/schema'
import { todayIso } from '@/data/schema'
import { parseQuickAdd, type QuickAddDraft } from '@/domain/quickadd'
import { formatFull } from '@/lib/money'

/**
 * §9.1 item 2 and §9.2.
 *
 * The bar never writes. It parses, opens the confirm sheet with every field
 * editable, and waits. A failed parse opens the same sheet pre-filled with
 * whatever was understood and focuses the first empty field — it does not throw
 * the user's sentence away with a toast.
 */

const KIND_LABEL: Record<TransactionKind, string> = {
  expense: 'Spent',
  income: 'Received',
  investment: 'Invested',
  transfer: 'Moved',
}

export function QuickAddBar() {
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<QuickAddDraft | null>(null)
  const [amountText, setAmountText] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const snapshot = useSnapshot()
  const create = useData((state) => state.create)

  function open(): void {
    const parsed = parseQuickAdd(text)
    setDraft(parsed)
    setAmount(parsed.amount)
    setAmountText(parsed.amount === null ? '' : formatFull(parsed.amount))
  }

  function close(): void {
    setDraft(null)
    setSaving(false)
  }

  async function confirm(): Promise<void> {
    if (draft === null || amount === null) return
    setSaving(true)
    const categoryId =
      snapshot?.categories.find((category) => category.name === draft.categoryName)?.id ?? null

    await create('transactions', {
      date: todayIso(),
      kind: draft.kind,
      amount,
      categoryId,
      note: draft.note,
      fromQuickAdd: true,
      recurring: draft.recurring,
    })
    setText('')
    close()
  }

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          open()
        }}
      >
        <div className="relative flex-1">
          <Sparkles
            aria-hidden
            className="text-gold pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <input
            id="quick-add"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
            }}
            placeholder="Type anything — 'paid 15k rent' or 'invested 10k in mutual funds'"
            aria-label="Quick add a transaction"
            className="rounded-tile border-border bg-surface text-text placeholder:text-text-3 focus-visible:outline-text-2 h-11 w-full border pr-3 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
        <AppButton type="submit" disabled={text.trim().length === 0}>
          <Plus aria-hidden className="size-4" />
          Add
        </AppButton>
      </form>

      <Sheet
        open={draft !== null}
        onClose={close}
        title="Check this before it is saved"
        description="Nothing is written until you confirm."
        footer={
          <div className="flex gap-2">
            <AppButton variant="ghost" onClick={close} block>
              Cancel
            </AppButton>
            <AppButton
              onClick={() => {
                void confirm()
              }}
              disabled={amount === null || saving}
              block
            >
              {saving ? 'Saving…' : 'Save'}
            </AppButton>
          </div>
        }
      >
        {draft === null ? null : (
          <div className="space-y-4">
            <div>
              <span className="text-caption text-text-2">Type</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(['expense', 'income', 'investment'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, kind })
                    }}
                    aria-pressed={draft.kind === kind}
                    className={
                      draft.kind === kind
                        ? 'bg-gold text-on-gold rounded-full px-3 py-1.5 text-sm font-medium'
                        : 'border-border text-text-2 hover:border-border-strong rounded-full border px-3 py-1.5 text-sm'
                    }
                  >
                    {KIND_LABEL[kind]}
                  </button>
                ))}
              </div>
              {draft.confidence.kind ? null : (
                <p className="text-caption text-warn mt-1.5">Guessed — check this is right.</p>
              )}
            </div>

            <NumberField
              label="Amount"
              value={amountText}
              onValueChange={(raw, parsed) => {
                setAmountText(raw)
                setAmount(parsed)
              }}
              hint={
                draft.confidence.amount
                  ? undefined
                  : 'No amount found in what you typed — add one to save.'
              }
            />

            <label className="block">
              <span className="text-caption text-text-2">Note</span>
              <input
                value={draft.note}
                onChange={(event) => {
                  setDraft({ ...draft, note: event.target.value })
                }}
                className="rounded-tile border-border bg-surface text-text focus-visible:outline-text-2 mt-1.5 h-11 w-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              />
            </label>

            {draft.categoryName === null ? null : (
              <p className="text-caption text-text-2">
                Category: <span className="text-text">{draft.categoryName}</span>
              </p>
            )}

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.recurring}
                onChange={(event) => {
                  setDraft({ ...draft, recurring: event.target.checked })
                }}
                className="size-4 accent-[var(--gold)]"
              />
              <span className="text-text-2 text-sm">This repeats every month</span>
            </label>
          </div>
        )}
      </Sheet>
    </>
  )
}
