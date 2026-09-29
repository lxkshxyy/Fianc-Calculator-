import { FileText, Trash2, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { EmptyState } from './EmptyState'

/**
 * §9.4's list, and §2.1.8's promise that **every** list has an empty state.
 *
 * Rows are buttons when `onSelect` is given, so the detail sheet opens from the
 * keyboard as well as a tap (§2.1.10), and they are plain list items when not —
 * rather than a div with a click handler, which is neither.
 *
 * `onDelete` puts a bin on each row, behind a confirm step that opens inside the
 * row rather than in a modal: a single record is a small enough thing to remove
 * that stealing the whole screen to ask about it is out of proportion, and one
 * stray tap is not. The delete control is a sibling of the row body, never a
 * child of it, because a button inside a button is not a thing a browser or a
 * screen reader can make sense of.
 */
export type RecordRow = {
  id: string
  icon?: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  meta?: ReactNode
  /** Rendered full-width under the row — a progress bar, a warning line. */
  footer?: ReactNode
  /**
   * The row's name in plain text, for the delete button's accessible name.
   *
   * `title` is a ReactNode and may be a whole element, so it cannot be dropped
   * into an aria-label. Without this every bin in the list reads as "Delete",
   * which tells a screen-reader user nothing about which one they are on.
   */
  deleteLabel?: string
  /**
   * Said under "Remove this?" when deleting the row takes more with it — a
   * document's delete also removes what it added to the rest of the app.
   */
  deleteNote?: string
  /**
   * The document this record was read from, by name. Shown as a small "From …"
   * line, so it is plain which records a document brought in — and will take
   * with it when it is deleted — and which were typed in by hand.
   */
  source?: string
}

export function RecordList({
  rows,
  empty,
  onSelect,
  onDelete,
  className,
}: {
  rows: RecordRow[]
  empty: { icon: LucideIcon; title: string; description: string; action?: ReactNode }
  onSelect?: (id: string) => void
  /** Given, each row gets a bin and a confirm step. Removes that record only. */
  onDelete?: (id: string) => void
  className?: string
}) {
  const t = useT()
  /* One id at a time: opening a second confirm closes the first, so there is
     never a list with two rows both asking to be deleted. */
  const [confirming, setConfirming] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    )
  }

  return (
    <ul
      className={cn(
        'divide-border rounded-card border-border bg-surface divide-y overflow-hidden border',
        className,
      )}
    >
      {rows.map((row) => {
        const body = (
          <>
            <div className="flex items-center gap-3">
              {row.icon === undefined ? null : (
                <row.icon aria-hidden className="text-text-3 size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                {/*
                 * Two lines before an ellipsis, not one: on a 360px phone with an
                 * amount on the right, one line left titles as "Freelance your …".
                 */}
                <div className="text-text line-clamp-2 text-sm font-medium break-words">
                  {row.title}
                </div>
                {row.subtitle === undefined ? null : (
                  <div className="text-caption text-text-2 truncate">{row.subtitle}</div>
                )}
                {row.source === undefined ? null : (
                  <div className="text-caption text-text-3 mt-0.5 flex min-w-0 items-center gap-1">
                    <FileText aria-hidden className="size-3 shrink-0" />
                    <span className="truncate">
                      {t('record.fromDocument', { name: row.source })}
                    </span>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                {row.value}
                {row.meta === undefined ? null : (
                  <div className="text-caption text-text-2">{row.meta}</div>
                )}
              </div>
            </div>
            {row.footer === undefined ? null : <div className="mt-2.5">{row.footer}</div>}
          </>
        )

        const main =
          onSelect === undefined ? (
            <div className="min-w-0 flex-1 px-4 py-3.5">{body}</div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelect(row.id)
              }}
              className="hover:bg-surface-2 focus-visible:outline-text-2 min-w-0 flex-1 px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              {body}
            </button>
          )

        const open = confirming === row.id

        return (
          <li key={row.id}>
            <div className="flex items-start">
              {main}
              {onDelete === undefined ? null : (
                <button
                  type="button"
                  aria-label={t('record.deleteNamed', { name: row.deleteLabel ?? '' }).trim()}
                  aria-expanded={open}
                  onClick={() => {
                    setConfirming(open ? null : row.id)
                  }}
                  className={cn(
                    'rounded-tile focus-visible:outline-text-2 mt-2.5 mr-2 flex size-10 shrink-0 items-center justify-center transition-colors focus-visible:outline-2',
                    open ? 'text-danger' : 'text-text-3 hover:text-danger',
                  )}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </div>

            {onDelete === undefined || !open ? null : (
              <div className="bg-surface-2 border-border flex flex-wrap items-center justify-end gap-2 border-t px-4 py-2.5">
                <div className="mr-auto min-w-0">
                  <p className="text-caption text-text-2">{t('record.confirmDelete')}</p>
                  {row.deleteNote === undefined ? null : (
                    <p className="text-caption text-text mt-0.5 font-medium">{row.deleteNote}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null)
                    }}
                    className="rounded-button border-border text-text-2 hover:border-border-strong min-h-9 border px-3 text-sm"
                  >
                    {t('action.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null)
                      onDelete(row.id)
                    }}
                    className="rounded-button bg-danger min-h-9 px-3 text-sm font-medium text-white"
                  >
                    {t('action.delete')}
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A thin proportion bar. `value` is 0–1 and is clamped; over-budget shows danger. */
export function Meter({
  value,
  tone = 'gold',
}: {
  value: number
  tone?: 'gold' | 'danger' | 'success'
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100
  return (
    <span className="bg-surface-2 block h-1.5 w-full overflow-hidden rounded-full">
      <span
        className={cn(
          'block h-full rounded-full',
          tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-gold',
        )}
        style={{ width: `${String(pct)}%` }}
      />
    </span>
  )
}
