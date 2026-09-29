import { useMemo } from 'react'
import { create } from 'zustand'

import type { ImportAction } from '../../domain/docimport'
import { planRemoval, planSweep, type RemovalStep } from '../../domain/docremove'
import { derive, type Derived } from '../../domain/derive'
import { repo } from '../repo'
import type { CollectionName, Collections, Draft, Patch, Snapshot } from '../repo/types'
import {
  ImportTarget,
  newId,
  type DocumentRecord,
  type ImportedRecord,
  type Profile,
  type TaxProfile,
} from '../schema'
import { deliverQueued } from '../sync/outbox'

/**
 * §8.1 — the domain slice. Deliberately **not** persisted.
 *
 * `persist` on a domain slice writes a second copy to localStorage and rehydrates
 * it synchronously while Dexie resolves async, so every cold boot paints stale
 * data and then flips. Worse, "Clear everything" would wipe Dexie and leave the
 * localStorage copy to resurrect deleted records on the next reload. Dexie is
 * the only store of record; this slice is a cache of it for the current tab.
 */

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error'

type DataState = {
  status: DataStatus
  snapshot: Snapshot | null
  error: string | null

  load: () => Promise<void>
  create: <K extends CollectionName>(
    name: K,
    draft: Draft<Collections[K]>,
  ) => Promise<Collections[K] | null>
  update: <K extends CollectionName>(
    name: K,
    id: string,
    patch: Patch<Collections[K]>,
  ) => Promise<void>
  remove: <K extends CollectionName>(name: K, id: string) => Promise<void>
  /** Stores the file, then the record pointing at it. Null when either write failed. */
  addDocument: (
    file: Blob,
    draft: Omit<Draft<DocumentRecord>, 'fileId'>,
  ) => Promise<DocumentRecord | null>
  /**
   * The record and its file, together — never one left behind without the
   * other — and whatever the document brought into the rest of the app
   * (domain/docremove.ts decides what that means record by record).
   */
  removeDocument: (id: string) => Promise<void>
  /**
   * Writes what a scanned document adds to the app (domain/docimport.ts), and
   * records on that document what it wrote — and, for a change, what was there
   * before — so deleting the document can take it back (domain/docremove.ts).
   * Each record is checked on its own: one that fails is skipped and the rest
   * still land, and the app never drops into its error state over an imported
   * figure. Resolves to how many were written.
   */
  applyImport: (documentId: string, actions: ImportAction[]) => Promise<number>
  saveProfile: (patch: Partial<Profile>) => Promise<void>
  saveTaxProfile: (patch: Partial<TaxProfile>) => Promise<void>
  resetToDemo: () => Promise<void>
  clearEverything: () => Promise<void>
}

function isImportTarget(name: string): name is ImportTarget {
  return ImportTarget.safeParse(name).success
}

/** The named fields of a record, for putting them back later. */
function pick(record: object, keys: string[]): Record<string, unknown> {
  const source = record as Record<string, unknown>
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]))
}

/**
 * Carries out what domain/docremove.ts planned. Each step stands alone: one
 * that fails is logged and the rest still happen — and a record it missed
 * still carries its document's mark, so the next sweep finds it.
 */
async function carryOut(steps: RemovalStep[], documents: DocumentRecord[]): Promise<void> {
  for (const step of steps) {
    try {
      if (step.op === 'remove') await repo.remove(step.collection, step.id)
      else if (step.op === 'restore') await repo.update(step.collection, step.id, step.patch)
      else if (step.op === 'restore-tax-profile') await repo.saveTaxProfile(step.patch)
      else {
        const heir = documents.find((entry) => entry.id === step.documentId)
        if (heir === undefined) continue
        await repo.update(step.collection, step.id, { fromDocument: heir.id })
        await repo.update('documents', heir.id, {
          imported: heir.imported.map((entry, index) =>
            index === step.index ? { ...entry, created: true } : entry,
          ),
        })
      }
    } catch (error) {
      console.warn('A record brought in by a document could not be taken back.', error)
    }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong reading your data.'
}

export const useData = create<DataState>()((set, get) => {
  /** Every mutation refreshes from the repository, so the cache cannot drift from storage. */
  async function refresh(): Promise<void> {
    const snapshot = await repo.read()
    set({ snapshot, status: 'ready', error: null })
  }

  /** Sends whatever is queued, then re-reads so a screen sees `sent` as soon as it is. */
  function deliver(): void {
    void deliverQueued().then(async (sent) => {
      if (sent > 0) await refresh()
    })
  }

  /*
   * A request made on a train is sent when the signal comes back, not only on
   * the next launch. Registered once, the first time the data loads.
   */
  let listeningForOnline = false

  async function guarded(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: message(error) })
    }
  }

  return {
    status: 'idle',
    snapshot: null,
    error: null,

    load: async () => {
      if (get().status === 'loading') return
      set({ status: 'loading', error: null })
      await guarded(async () => {
        await repo.ready()
        await refresh()
        /* Data whose document is already gone goes too (domain/docremove.ts). */
        const snapshot = get().snapshot
        const orphans = snapshot === null ? [] : planSweep(snapshot)
        if (snapshot !== null && orphans.length > 0) {
          await carryOut(orphans, snapshot.documents)
          await refresh()
        }
      })
      /* Anything left queued last time goes now — in the background, and only
         when there is somewhere to send it (config/server.ts, config/automation.ts). */
      deliver()
      if (!listeningForOnline && typeof window !== 'undefined') {
        listeningForOnline = true
        window.addEventListener('online', deliver)
      }
    },

    create: async (name, draft) => {
      let created: Collections[typeof name] | null = null
      await guarded(async () => {
        created = await repo.create(name, draft)
        await refresh()
      })
      /* A request written to the WRC team (a Diamond upgrade) goes straight away. */
      if (created !== null && 'delivery' in draft && draft.delivery === 'queued') deliver()
      return created
    },

    update: async (name, id, patch) => {
      await guarded(async () => {
        await repo.update(name, id, patch)
        await refresh()
      })
    },

    remove: async (name, id) => {
      await guarded(async () => {
        await repo.remove(name, id)
        await refresh()
      })
    },

    addDocument: async (file, draft) => {
      let created: DocumentRecord | null = null
      const fileId = newId('file')
      await guarded(async () => {
        await repo.putFile(fileId, file)
        try {
          created = await repo.create('documents', { ...draft, fileId })
        } catch (error) {
          /* The record was refused, so the file has nothing pointing at it. */
          await repo.removeFile(fileId)
          throw error
        }
        await refresh()
      })
      if (created !== null && draft.delivery === 'queued') deliver()
      return created
    },

    removeDocument: async (id) => {
      await guarded(async () => {
        const snapshot = get().snapshot
        const record = snapshot?.documents.find((entry) => entry.id === id)
        /* What it brought in goes first, while the document still says what that was. */
        if (snapshot !== null) await carryOut(planRemoval(id, snapshot).steps, snapshot.documents)
        await repo.remove('documents', id)
        if (record !== undefined && record.fileId !== null) await repo.removeFile(record.fileId)
        await refresh()
      })
    },

    applyImport: async (documentId, actions) => {
      const imported: ImportedRecord[] = []
      await guarded(async () => {
        const before = get().snapshot
        for (const action of actions) {
          try {
            if (action.op === 'create') {
              /* Marked with its document, so it goes when the document does — and only then. */
              const created = await repo.create(action.collection, {
                ...action.draft,
                fromDocument: documentId,
              })
              if (isImportTarget(action.collection)) {
                imported.push({
                  target: action.collection,
                  id: created.id,
                  created: true,
                  wrote: {},
                  before: null,
                })
              }
            } else if (action.op === 'update') {
              const rows = before?.[action.collection] as Record<string, unknown>[] | undefined
              const was = rows?.find((row) => row['id'] === action.id)
              await repo.update(action.collection, action.id, action.patch)
              if (isImportTarget(action.collection)) {
                imported.push({
                  target: action.collection,
                  id: action.id,
                  created: false,
                  wrote: { ...action.patch },
                  before: was === undefined ? null : pick(was, Object.keys(action.patch)),
                })
              }
            } else {
              const was = before?.taxProfile
              await repo.saveTaxProfile(action.patch)
              imported.push({
                target: 'taxProfile',
                id: 'taxProfile',
                created: false,
                wrote: { ...action.patch },
                before: was === undefined ? null : pick(was, Object.keys(action.patch)),
              })
            }
          } catch (error) {
            console.warn('A record read from a document was not saved.', error)
          }
        }
        if (imported.length > 0) await repo.update('documents', documentId, { imported })
        await refresh()
      })
      return imported.length
    },

    saveProfile: async (patch) => {
      await guarded(async () => {
        await repo.saveProfile(patch)
        await refresh()
      })
    },

    saveTaxProfile: async (patch) => {
      await guarded(async () => {
        await repo.saveTaxProfile(patch)
        await refresh()
      })
    },

    resetToDemo: async () => {
      await guarded(async () => {
        await repo.resetToDemo()
        await refresh()
      })
    },

    clearEverything: async () => {
      await guarded(async () => {
        await repo.clearEverything()
        await refresh()
      })
    },
  }
})

/** The loaded snapshot, or `null` while it is still opening. */
export function useSnapshot(): Snapshot | null {
  return useData((state) => state.snapshot)
}

/**
 * Every derived figure, recomputed only when the snapshot identity changes.
 * Returns `null` before the first read completes so callers render a skeleton
 * rather than zeroes that are about to change.
 */
export function useDerived(): Derived | null {
  const snapshot = useSnapshot()
  return useMemo(() => (snapshot === null ? null : derive(snapshot)), [snapshot])
}

/**
 * The bytes behind a document, for previewing it. Read on demand, one file at a
 * time — files are never part of the snapshot.
 */
export async function readDocumentFile(fileId: string): Promise<Blob | null> {
  try {
    return await repo.getFile(fileId)
  } catch (error) {
    console.warn('Could not read a stored document.', error)
    return null
  }
}

/**
 * The name of the document a record was read from, or undefined for one typed
 * in by hand — for the "From …" line on a record's row.
 */
export function useSourceName(): (record: { fromDocument?: string }) => string | undefined {
  const documents = useData((state) => state.snapshot?.documents)
  return useMemo(() => {
    const names = new Map((documents ?? []).map((entry) => [entry.id, entry.name]))
    return (record) =>
      record.fromDocument === undefined ? undefined : names.get(record.fromDocument)
  }, [documents])
}

/** The profile record. Authoritative for display name and tier (§8.1). */
export function useProfile(): Profile | null {
  return useData((state) => state.snapshot?.profile ?? null)
}
