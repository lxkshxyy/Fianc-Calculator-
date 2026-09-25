import { useMemo } from 'react'
import { create } from 'zustand'

import { derive, type Derived } from '../../domain/derive'
import { repo } from '../repo'
import type { CollectionName, Collections, Draft, Patch, Snapshot } from '../repo/types'
import { newId, type DocumentRecord, type Profile, type TaxProfile } from '../schema'
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
  /** The record and its file, together — never one left behind without the other. */
  removeDocument: (id: string) => Promise<void>
  saveProfile: (patch: Partial<Profile>) => Promise<void>
  saveTaxProfile: (patch: Partial<TaxProfile>) => Promise<void>
  resetToDemo: () => Promise<void>
  clearEverything: () => Promise<void>
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
        const record = get().snapshot?.documents.find((entry) => entry.id === id)
        await repo.remove('documents', id)
        if (record !== undefined && record.fileId !== null) await repo.removeFile(record.fileId)
        await refresh()
      })
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

/** The profile record. Authoritative for display name and tier (§8.1). */
export function useProfile(): Profile | null {
  return useData((state) => state.snapshot?.profile ?? null)
}
