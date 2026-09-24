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

/**
 * v2 of the database adds the document file store. An install that has been
 * running v1 — every phone the app is on today — has to open straight into v2
 * with its household intact, and the records saved before upload and profile
 * pictures existed have to read back rather than being dropped as invalid.
 */
describe('upgrading to the file store', () => {
  beforeEach(async () => {
    await Dexie.delete('wrc')
    await Dexie.delete('prosperitypath')
  })

  it('keeps v1 records, and reads old documents and profiles with the new fields defaulted', async () => {
    const v1 = openByName('wrc')
    await v1.open()
    await v1.table('singletons').put({
      key: 'profile',
      value: {
        id: 'prof_1',
        createdAt: 1,
        updatedAt: 1,
        displayName: 'Lakshay Sharma',
        tier: 'silver',
        stageId: 'clarity',
        language: 'hi',
        streakCount: 2,
        lastCheckInDate: null,
        dashboardLayout: null,
        hiddenDashboardSections: [],
      },
    })
    await v1.table('documents').put({
      id: 'doc_old',
      createdAt: 1,
      updatedAt: 1,
      name: 'Old policy.pdf',
      kind: 'insurance-policy',
      sizeBytes: 1000,
      uploadedOn: '2026-01-02',
      tags: [],
    })
    await v1.table('family').put({
      id: 'fam_old',
      createdAt: 1,
      updatedAt: 1,
      name: 'Asha',
      relation: 'parent',
      includeInHousehold: false,
    })
    v1.close()

    const repo = new LocalRepository()
    const snapshot = await repo.read()

    expect(snapshot.profile.displayName).toBe('Lakshay Sharma')
    expect(snapshot.profile.language).toBe('hi')
    expect(snapshot.profile.avatar).toBeNull()
    expect(snapshot.profile.phone).toBe('')

    const document = snapshot.documents.find((row) => row.id === 'doc_old')
    expect(document?.fileId).toBeNull()
    expect(document?.scan).toBeNull()
    expect(document?.delivery).toBe('local')

    const member = snapshot.family.find((row) => row.id === 'fam_old')
    expect(member?.dependent).toBe(false)
    expect(member?.dateOfBirth).toBeNull()
  })

  /* fake-indexeddb cannot clone a jsdom Blob faithfully, so this checks the
     table round-trip only; the bytes themselves are checked against the
     in-memory store in local.test.ts, and in a real browser by hand. */
  it('stores, returns and removes a document file', async () => {
    const repo = new LocalRepository()
    await repo.ready()
    await repo.putFile('file_1', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }))
    expect(await repo.getFile('file_1')).not.toBeNull()

    await repo.removeFile('file_1')
    expect(await repo.getFile('file_1')).toBeNull()
  })

  it('clears files along with the records that pointed at them', async () => {
    const repo = new LocalRepository()
    await repo.ready()
    await repo.putFile('file_2', new Blob(['x']))
    await repo.clearEverything()
    expect(await repo.getFile('file_2')).toBeNull()
  })
})
