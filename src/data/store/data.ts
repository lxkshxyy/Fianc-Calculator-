import { useMemo } from 'react'
import { create } from 'zustand'

import { derive, type Derived } from '../../domain/derive'
import { repo } from '../repo'
import type { CollectionName, Collections, Draft, Patch, Snapshot } from '../repo/types'
import type { Profile, TaxProfile } from '../schema'

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
    },

    create: async (name, draft) => {
      let created: Collections[typeof name] | null = null
      await guarded(async () => {
        created = await repo.create(name, draft)
        await refresh()
      })
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

/** The profile record. Authoritative for display name and tier (§8.1). */
export function useProfile(): Profile | null {
  return useData((state) => state.snapshot?.profile ?? null)
}
