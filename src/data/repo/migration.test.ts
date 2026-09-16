/*
 * A real IndexedDB, in memory — imported here and nowhere else.
 *
 * It is deliberately NOT in vitest.setup.ts. `local.test.ts` asserts that the
 * app opens when IndexedDB is *absent* (§2.1.6 — a private window, or site data
 * blocked), and a global stub would quietly delete that coverage by making the
 * condition impossible to reach.
 */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'

import { COLLECTION_NAMES } from './types'
import { LocalRepository } from './local'

const STORES = (() => {
  const stores: Record<string, string> = { singletons: 'key' }
  for (const name of COLLECTION_NAMES) stores[name] = 'id'
  return stores
})()

function openByName(name: string): Dexie {
  const db = new Dexie(name)
  db.version(1).stores(STORES)
  return db
}

/**
 * The rename from `prosperitypath` to `wrc`.
 *
 * An IndexedDB database is addressed by name, so renaming one does not move the
 * data: it opens a different, empty database and the household sits there
 * invisible. In a finance app that is somebody's assets and loans disappearing
 * on the first launch after an update, with no error to explain it.
 */
describe('carrying data across the rename', () => {
  beforeEach(async () => {
    await Dexie.delete('wrc')
    await Dexie.delete('prosperitypath')
  })

  it('moves an existing household into the new database', async () => {
    const legacy = openByName('prosperitypath')
    await legacy.open()
    await legacy.table('assets').put({
      id: 'ass_old1',
      name: 'HDFC savings',
      kind: 'bank',
      value: 250_000,
      nominee: null,
      createdAt: 1,
      updatedAt: 1,
    })
    await legacy.table('singletons').put({ key: 'seeded', value: true })
    legacy.close()

    const snapshot = await new LocalRepository().read()
    expect(snapshot.assets.find((row) => row.id === 'ass_old1')?.name).toBe('HDFC savings')
  })

  it('leaves the original database intact, so a failed run loses nothing', async () => {
    const legacy = openByName('prosperitypath')
    await legacy.open()
    await legacy.table('assets').put({
      id: 'ass_old1',
      name: 'HDFC savings',
      kind: 'bank',
      value: 250_000,
      nominee: null,
      createdAt: 1,
      updatedAt: 1,
    })
    await legacy.table('singletons').put({ key: 'seeded', value: true })
    legacy.close()

    await new LocalRepository().read()

    const check = openByName('prosperitypath')
    await check.open()
    expect(await check.table('assets').count()).toBe(1)
    check.close()
  })

  it('does not run on a fresh install, and does not create the old database', async () => {
    await new LocalRepository().read()
    /* `Dexie.exists` rather than opening it — opening a database by name creates
       it, which would make every fresh install look like it had data to move. */
    expect(await Dexie.exists('prosperitypath')).toBe(false)
  })

  it('does not overwrite data already in the new database', async () => {
    const current = openByName('wrc')
    await current.open()
    await current.table('singletons').put({ key: 'seeded', value: true })
    await current.table('assets').put({
      id: 'ass_mine',
      name: 'Mine',
      kind: 'cash',
      value: 100,
      nominee: null,
      createdAt: 1,
      updatedAt: 1,
    })
    current.close()

    const legacy = openByName('prosperitypath')
    await legacy.open()
    await legacy.table('assets').put({
      id: 'ass_old1',
      name: 'Should not appear',
      kind: 'bank',
      value: 1,
      nominee: null,
      createdAt: 1,
      updatedAt: 1,
    })
    legacy.close()

    const snapshot = await new LocalRepository().read()
    expect(snapshot.assets.find((row) => row.id === 'ass_old1')).toBeUndefined()
  })
})
