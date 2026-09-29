import type { CollectionName, Snapshot } from '../data/repo/types'
import type { DocumentRecord, ImportedRecord, ImportTarget } from '../data/schema'
import type { ImportSection } from './docimport'

/**
 * Deleting a document takes back what it brought into the app.
 *
 * When a document is saved, docimport.ts writes records elsewhere — a policy on
 * Insurance, a salary on Income, a month of transactions on Budget — and the
 * document keeps a list of them (`DocumentRecord.imported`). This works out
 * what deleting it should do to each one.
 *
 * Pure: the document, the other documents and the app's records in, a list of
 * steps out. The data store carries the steps out (removeDocument).
 *
 * ── The rules ───────────────────────────────────────────────────────────────
 * - A record the document **created** is removed — unless another document the
 *   person is keeping also brought it in (this month's salary slip after last
 *   month's). Then it stays, and that document becomes the one that created it,
 *   so deleting that one later removes it.
 * - A record the document **changed** gets its earlier values back — but only
 *   if they are still the values this document wrote. If the person has edited
 *   it since, or another document changed it again, the newer values stand.
 * - A record that is already gone (deleted by hand on its own page) is skipped.
 * - A record the person typed in themselves is never removed. Only records a
 *   document created carry that document's id (`fromDocument`), and only
 *   those can go when a document does.
 *
 * Every record a document creates is marked with it, as well as listed on it.
 * The mark is what makes this hold even when the list is incomplete — the app
 * closed half way through saving — and it lets `planSweep` find anything whose
 * document is already gone, so no document's data outlives the document.
 */

/** The collections a document can add records to — everything it touches but the tax profile. */
export type RecordTarget = Exclude<ImportTarget, 'taxProfile'>

export const RECORD_TARGETS: RecordTarget[] = [
  'policies',
  'incomeSources',
  'investments',
  'liabilities',
  'transactions',
  'deductions',
]

export type RemovalStep =
  | { op: 'remove'; collection: RecordTarget; id: string }
  | { op: 'restore'; collection: CollectionName; id: string; patch: Record<string, unknown> }
  | { op: 'restore-tax-profile'; patch: Record<string, unknown> }
  /**
   * A record stays because another document also brought it in: that
   * document's entry (`index` in its `imported`) becomes the one that created
   * it, and the record is marked as that document's.
   */
  | { op: 'hand-over'; documentId: string; index: number; collection: RecordTarget; id: string }

export type RemovalPlan = {
  steps: RemovalStep[]
  /** Counts for the confirmation line, by where the records live. */
  removed: Partial<Record<ImportTarget, number>>
  restored: Partial<Record<ImportTarget, number>>
}

export type RemovalContext = Pick<
  Snapshot,
  | 'documents'
  | 'policies'
  | 'incomeSources'
  | 'investments'
  | 'liabilities'
  | 'transactions'
  | 'deductions'
  | 'taxProfile'
>

export const TARGET_SECTION: Record<ImportTarget, ImportSection> = {
  policies: 'insurance',
  incomeSources: 'income',
  investments: 'investments',
  liabilities: 'loans',
  transactions: 'budget',
  deductions: 'tax',
  taxProfile: 'tax',
}

type Row = { id: string; fromDocument?: string }

function rowsOf(context: RemovalContext, target: RecordTarget): Row[] {
  return context[target]
}

/** The record a document entry points at, or undefined when it is gone. */
function current(
  context: RemovalContext,
  target: ImportTarget,
  id: string,
): Record<string, unknown> | undefined {
  if (target === 'taxProfile') return context.taxProfile
  return rowsOf(context, target).find((row) => row.id === id)
}

/** The newest of `documents` that also lists this record, and where in its list. */
function heirOf(
  documents: DocumentRecord[],
  target: ImportTarget,
  id: string,
): { documentId: string; index: number } | undefined {
  for (const other of documents) {
    const index = other.imported.findIndex(
      (candidate) => candidate.target === target && candidate.id === id,
    )
    if (index >= 0) return { documentId: other.id, index }
  }
  return undefined
}

function newestFirst(documents: DocumentRecord[]): DocumentRecord[] {
  return [...documents].sort((a, b) => b.createdAt - a.createdAt)
}

/** Whether every field the document wrote still holds the value it wrote. */
function stillAsWritten(record: Record<string, unknown>, wrote: Record<string, unknown>): boolean {
  return Object.entries(wrote).every(
    ([key, value]) => JSON.stringify(record[key]) === JSON.stringify(value),
  )
}

export function planRemoval(documentId: string, context: RemovalContext): RemovalPlan {
  const plan: RemovalPlan = { steps: [], removed: {}, restored: {} }
  const document = context.documents.find((entry) => entry.id === documentId)
  if (document === undefined) return plan

  /* The other documents, newest first — the newest is the one a record is handed to. */
  const others = newestFirst(context.documents.filter((entry) => entry.id !== documentId))
  const kept = new Set(others.map((entry) => entry.id))
  const count = (tally: Partial<Record<ImportTarget, number>>, target: ImportTarget): void => {
    tally[target] = (tally[target] ?? 0) + 1
  }

  /* What the document lists, and anything marked as its own that the list missed. */
  const entries: ImportedRecord[] = [...document.imported]
  for (const target of RECORD_TARGETS) {
    for (const row of rowsOf(context, target)) {
      if (row.fromDocument !== documentId) continue
      const listed = entries.some((entry) => entry.target === target && entry.id === row.id)
      if (!listed) entries.push({ target, id: row.id, created: true, wrote: {}, before: null })
    }
  }

  for (const entry of entries) {
    const record = current(context, entry.target, entry.id)
    if (record === undefined) continue
    const heir = heirOf(others, entry.target, entry.id)

    if (entry.created) {
      if (entry.target === 'taxProfile') continue
      /* Marked as another document's that is being kept: not this one's to take. */
      const owner = record['fromDocument']
      if (typeof owner === 'string' && owner !== documentId && kept.has(owner)) continue
      if (heir !== undefined) {
        plan.steps.push({ op: 'hand-over', ...heir, collection: entry.target, id: entry.id })
      } else {
        plan.steps.push({ op: 'remove', collection: entry.target, id: entry.id })
        count(plan.removed, entry.target)
      }
      continue
    }

    /* A change: put the old values back, if nothing else vouches for or has moved past these. */
    if (heir !== undefined || entry.before === null) continue
    if (!stillAsWritten(record, entry.wrote)) continue
    if (entry.target === 'taxProfile') {
      plan.steps.push({ op: 'restore-tax-profile', patch: entry.before })
    } else {
      plan.steps.push({
        op: 'restore',
        collection: entry.target,
        id: entry.id,
        patch: entry.before,
      })
    }
    count(plan.restored, entry.target)
  }
  return plan
}

/**
 * Records marked as coming from a document that no longer exists — left behind
 * when the app closed part way through deleting one. Each is removed, unless a
 * document the person is keeping also brought it in; then it becomes that
 * document's. Records typed in by hand carry no mark and are never touched.
 */
export function planSweep(context: RemovalContext): RemovalStep[] {
  const kept = new Set(context.documents.map((entry) => entry.id))
  const documents = newestFirst(context.documents)
  const steps: RemovalStep[] = []
  for (const target of RECORD_TARGETS) {
    for (const row of rowsOf(context, target)) {
      if (row.fromDocument === undefined || kept.has(row.fromDocument)) continue
      const heir = heirOf(documents, target, row.id)
      steps.push(
        heir === undefined
          ? { op: 'remove', collection: target, id: row.id }
          : { op: 'hand-over', ...heir, collection: target, id: row.id },
      )
    }
  }
  return steps
}

const NOUN: Record<ImportTarget, [string, string]> = {
  policies: ['policy', 'policies'],
  incomeSources: ['income source', 'income sources'],
  investments: ['holding', 'holdings'],
  liabilities: ['loan', 'loans'],
  transactions: ['transaction', 'transactions'],
  deductions: ['tax deduction', 'tax deductions'],
  taxProfile: ['yearly income figure', 'yearly income figures'],
}

const PLACE: Record<ImportTarget, string> = {
  policies: 'Insurance',
  incomeSources: 'Income',
  investments: 'Investments',
  liabilities: 'EMI & Credit',
  transactions: 'Budget',
  deductions: 'Tax Planning',
  taxProfile: 'Tax Planning',
}

function phrase(tally: Partial<Record<ImportTarget, number>>): string[] {
  return (Object.entries(tally) as [ImportTarget, number][]).map(([target, number]) => {
    const [one, many] = NOUN[target]
    return `${String(number)} ${number === 1 ? one : many} from ${PLACE[target]}`
  })
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`
}

/**
 * The line the delete confirmation shows: "Also removes 1 policy from Insurance,
 * and undoes its changes to 1 income source on Income." Null when deleting the
 * document touches nothing else.
 */
export function describeRemoval(plan: RemovalPlan): string | null {
  const removed = phrase(plan.removed)
  const restored = (Object.entries(plan.restored) as [ImportTarget, number][]).map(
    ([target, number]) => {
      const [one, many] = NOUN[target]
      return `${String(number)} ${number === 1 ? one : many} on ${PLACE[target]}`
    },
  )
  const parts: string[] = []
  if (removed.length > 0) parts.push(`removes ${list(removed)}`)
  if (restored.length > 0) parts.push(`undoes its changes to ${list(restored)}`)
  if (parts.length === 0) return null
  return `Also ${parts.join(', and ')}.`
}
