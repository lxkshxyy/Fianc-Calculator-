import Dexie, { type Table } from 'dexie'
import type { z } from 'zod'

import {
  Achievement,
  Asset,
  Budget,
  Category,
  ChatMessage,
  ChatThread,
  CheckIn,
  CreditScore,
  DeductionEntry,
  DocumentRecord,
  FamilyMember,
  Goal,
  IncomeSource,
  InsurancePolicy,
  Investment,
  LearningModule,
  Liability,
  newId,
  nowMs,
  Profile,
  Referral,
  RequestTicket,
  StageTaskCompletion,
  TaxProfile,
  Transaction,
} from '../schema'
import { demoSnapshot, emptySnapshot } from '../seed/demo'
import {
  COLLECTION_NAMES,
  type CollectionName,
  type Collections,
  type Draft,
  type Patch,
  type Repository,
  type Snapshot,
} from './types'

/**
 * §8.1 — the only file that knows Dexie exists.
 *
 * Two things here are load-bearing for §2.1.6 ("validate everything read from
 * storage; on parse failure reset *that slice only*; never throw on boot"):
 *
 *   1. Every row is parsed on the way out. A row that fails is dropped and
 *      logged, so one corrupt record cannot brick the collection it sits in,
 *      let alone the app.
 *   2. If IndexedDB is missing or refuses to open — a private window, blocked
 *      site data, a test environment — storage silently degrades to memory
 *      rather than rejecting. The app runs; it just forgets on reload.
 */

const SCHEMAS: { [K in CollectionName]: z.ZodType<Collections[K]> } = {
  incomeSources: IncomeSource,
  categories: Category,
  transactions: Transaction,
  budgets: Budget,
  liabilities: Liability,
  creditScores: CreditScore,
  assets: Asset,
  investments: Investment,
  goals: Goal,
  policies: InsurancePolicy,
  deductions: DeductionEntry,
  stageTasks: StageTaskCompletion,
  checkIns: CheckIn,
  learning: LearningModule,
  achievements: Achievement,
  referrals: Referral,
  documents: DocumentRecord,
  requests: RequestTicket,
  chatThreads: ChatThread,
  chatMessages: ChatMessage,
  family: FamilyMember,
}

const PROFILE_KEY = 'profile'
const TAX_PROFILE_KEY = 'taxProfile'

type SingletonRow = { key: string; value: unknown }

type FileRow = { id: string; blob: Blob }

/* ------------------------------------------------------------------ *
 * Storage adapters
 * ------------------------------------------------------------------ */

interface Storage {
  all(name: CollectionName): Promise<unknown[]>
  put(name: CollectionName, row: unknown): Promise<void>
  delete(name: CollectionName, id: string): Promise<void>
  replaceAll(name: CollectionName, rows: unknown[]): Promise<void>
  getSingleton(key: string): Promise<unknown>
  putSingleton(key: string, value: unknown): Promise<void>
  isEmpty(): Promise<boolean>
  putFile(id: string, blob: Blob): Promise<void>
  getFile(id: string): Promise<Blob | null>
  deleteFile(id: string): Promise<void>
  clearFiles(): Promise<void>
}

class MemoryStorage implements Storage {
  private readonly tables = new Map<CollectionName, unknown[]>()
  private readonly singletons = new Map<string, unknown>()
  private readonly files = new Map<string, Blob>()

  all(name: CollectionName): Promise<unknown[]> {
    return Promise.resolve([...(this.tables.get(name) ?? [])])
  }

  put(name: CollectionName, row: unknown): Promise<void> {
    const rows = this.tables.get(name) ?? []
    const id = (row as { id?: string }).id
    const index = rows.findIndex((entry) => (entry as { id?: string }).id === id)
    if (index >= 0) rows[index] = row
    else rows.push(row)
    this.tables.set(name, rows)
    return Promise.resolve()
  }

  delete(name: CollectionName, id: string): Promise<void> {
    const rows = this.tables.get(name) ?? []
    this.tables.set(
      name,
      rows.filter((entry) => (entry as { id?: string }).id !== id),
    )
    return Promise.resolve()
  }

  replaceAll(name: CollectionName, rows: unknown[]): Promise<void> {
    this.tables.set(name, [...rows])
    return Promise.resolve()
  }

  getSingleton(key: string): Promise<unknown> {
    return Promise.resolve(this.singletons.get(key))
  }

  putSingleton(key: string, value: unknown): Promise<void> {
    this.singletons.set(key, value)
    return Promise.resolve()
  }

  isEmpty(): Promise<boolean> {
    return Promise.resolve(this.singletons.size === 0)
  }

  putFile(id: string, blob: Blob): Promise<void> {
    this.files.set(id, blob)
    return Promise.resolve()
  }

  getFile(id: string): Promise<Blob | null> {
    return Promise.resolve(this.files.get(id) ?? null)
  }

  deleteFile(id: string): Promise<void> {
    this.files.delete(id)
    return Promise.resolve()
  }

  clearFiles(): Promise<void> {
    this.files.clear()
    return Promise.resolve()
  }
}

const DB_NAME = 'wrc'
/** What the database was called before the rebrand. Read once, never written. */
const LEGACY_DB_NAME = 'prosperitypath'

function storeDefinitions(): Record<string, string> {
  const stores: Record<string, string> = { singletons: 'key' }
  for (const name of COLLECTION_NAMES) stores[name] = 'id'
  return stores
}

class WrcDatabase extends Dexie {
  declare singletons: Table<SingletonRow, string>
  declare files: Table<FileRow, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(1).stores(storeDefinitions())
    /*
     * v2 adds the document file store and changes nothing else. Dexie carries
     * every v1 table across untouched, so an existing install upgrades in place
     * with all its records — there is no upgrade function because there is
     * nothing to transform.
     */
    this.version(2).stores({ files: 'id' })
  }

  table_(name: CollectionName): Table<unknown, string> {
    return this.table(name)
  }
}

/**
 * Carries a household across the rename from `prosperitypath` to `wrc`.
 *
 * An IndexedDB database is addressed by name, so renaming one does not move the
 * data — it opens a different, empty database and the old one sits there
 * invisible. For a notes app that is an annoyance. For somebody's assets, loans
 * and goals it is data loss, and it would have happened silently on the first
 * launch after an update.
 *
 * Deliberately one-way and non-destructive: the old database is read and left
 * exactly where it is. If this throws half-way, nothing has been lost — the
 * original is still intact and the next launch tries again, because the new
 * database is still empty.
 *
 * `Dexie.exists` avoids the trap that opening a database by name *creates* it,
 * which would make every fresh install look like it had something to migrate.
 */
async function migrateFromLegacy(target: WrcDatabase): Promise<void> {
  if (!(await target.singletons.count().then((count) => count === 0))) return
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return

  const legacy = new WrcDatabase(LEGACY_DB_NAME)
  try {
    await legacy.open()
    for (const name of COLLECTION_NAMES) {
      const rows = await legacy.table_(name).toArray()
      if (rows.length > 0) await target.table_(name).bulkPut(rows)
    }
    const singletons = await legacy.singletons.toArray()
    if (singletons.length > 0) await target.singletons.bulkPut(singletons)
    console.info('Moved your data across from the previous app name.')
  } finally {
    legacy.close()
  }
}

class DexieStorage implements Storage {
  constructor(private readonly db: WrcDatabase) {}

  async all(name: CollectionName): Promise<unknown[]> {
    return await this.db.table_(name).toArray()
  }

  async put(name: CollectionName, row: unknown): Promise<void> {
    await this.db.table_(name).put(row)
  }

  async delete(name: CollectionName, id: string): Promise<void> {
    await this.db.table_(name).delete(id)
  }

  async replaceAll(name: CollectionName, rows: unknown[]): Promise<void> {
    await this.db.table_(name).clear()
    if (rows.length > 0) await this.db.table_(name).bulkPut(rows)
  }

  async getSingleton(key: string): Promise<unknown> {
    const row = await this.db.singletons.get(key)
    return row?.value
  }

  async putSingleton(key: string, value: unknown): Promise<void> {
    await this.db.singletons.put({ key, value })
  }

  async isEmpty(): Promise<boolean> {
    const count = await this.db.singletons.count()
    return count === 0
  }

  async putFile(id: string, blob: Blob): Promise<void> {
    await this.db.files.put({ id, blob })
  }

  async getFile(id: string): Promise<Blob | null> {
    const row = await this.db.files.get(id)
    return row?.blob ?? null
  }

  async deleteFile(id: string): Promise<void> {
    await this.db.files.delete(id)
  }

  async clearFiles(): Promise<void> {
    await this.db.files.clear()
  }
}

async function openStorage(): Promise<Storage> {
  if (typeof globalThis.indexedDB === 'undefined') {
    return new MemoryStorage()
  }
  try {
    const db = new WrcDatabase()
    await db.open()
    /* A failed migration must not stop the app opening — the old data is still
       there to try again next launch, and an empty app beats a broken one. */
    try {
      await migrateFromLegacy(db)
    } catch (error) {
      console.warn('Could not carry data over from the previous app name.', error)
    }
    return new DexieStorage(db)
  } catch (error) {
    console.warn('IndexedDB unavailable; falling back to in-memory storage.', error)
    return new MemoryStorage()
  }
}

/* ------------------------------------------------------------------ *
 * Repository
 * ------------------------------------------------------------------ */

function parseRows<K extends CollectionName>(name: K, rows: unknown[]): Collections[K][] {
  const schema = SCHEMAS[name]
  const kept: Collections[K][] = []
  let dropped = 0
  for (const row of rows) {
    const parsed = schema.safeParse(row)
    if (parsed.success) kept.push(parsed.data)
    else dropped += 1
  }
  if (dropped > 0) {
    console.warn(`Dropped ${String(dropped)} unreadable row(s) from "${name}".`)
  }
  return kept
}

export class LocalRepository implements Repository {
  private storage: Storage | null = null
  private opening: Promise<void> | null = null

  ready(): Promise<void> {
    this.opening ??= this.open()
    return this.opening
  }

  private async open(): Promise<void> {
    this.storage = await openStorage()
    if (await this.storage.isEmpty()) {
      await this.write(demoSnapshot())
    }
  }

  private async store(): Promise<Storage> {
    await this.ready()
    return this.storage ?? new MemoryStorage()
  }

  private async write(snapshot: Snapshot): Promise<void> {
    const storage = this.storage ?? new MemoryStorage()
    for (const name of COLLECTION_NAMES) {
      await storage.replaceAll(name, snapshot[name])
    }
    await storage.putSingleton(PROFILE_KEY, snapshot.profile)
    await storage.putSingleton(TAX_PROFILE_KEY, snapshot.taxProfile)
  }

  async read(): Promise<Snapshot> {
    const storage = await this.store()

    const collections = {} as { [K in CollectionName]: Collections[K][] }
    for (const name of COLLECTION_NAMES) {
      const rows = await storage.all(name)
      // The cast restores the per-key relationship the loop erases.
      ;(collections as Record<string, unknown[]>)[name] = parseRows(name, rows)
    }

    const profileRaw = await storage.getSingleton(PROFILE_KEY)
    const profileParsed = Profile.safeParse(profileRaw)
    if (!profileParsed.success) {
      console.warn('Profile failed validation; reseeding that record only.')
    }
    const profile = profileParsed.success ? profileParsed.data : demoSnapshot().profile

    const taxRaw = await storage.getSingleton(TAX_PROFILE_KEY)
    const taxParsed = TaxProfile.safeParse(taxRaw)
    if (!taxParsed.success) {
      console.warn('Tax profile failed validation; reseeding that record only.')
    }
    const taxProfile = taxParsed.success ? taxParsed.data : demoSnapshot().taxProfile

    return { profile, taxProfile, ...collections }
  }

  async create<K extends CollectionName>(
    name: K,
    draft: Draft<Collections[K]>,
  ): Promise<Collections[K]> {
    const storage = await this.store()
    const at = nowMs()
    const candidate = { ...draft, id: newId(name.slice(0, 3)), createdAt: at, updatedAt: at }
    const parsed = SCHEMAS[name].parse(candidate)
    await storage.put(name, parsed)
    return parsed
  }

  async update<K extends CollectionName>(
    name: K,
    id: string,
    patch: Patch<Collections[K]>,
  ): Promise<Collections[K] | null> {
    const storage = await this.store()
    const rows = parseRows(name, await storage.all(name))
    const existing = rows.find((row) => row.id === id)
    if (existing === undefined) return null
    const parsed = SCHEMAS[name].parse({ ...existing, ...patch, id, updatedAt: nowMs() })
    await storage.put(name, parsed)
    return parsed
  }

  async remove<K extends CollectionName>(name: K, id: string): Promise<void> {
    const storage = await this.store()
    await storage.delete(name, id)
  }

  async putFile(id: string, file: Blob): Promise<void> {
    const storage = await this.store()
    await storage.putFile(id, file)
  }

  async getFile(id: string): Promise<Blob | null> {
    const storage = await this.store()
    return await storage.getFile(id)
  }

  async removeFile(id: string): Promise<void> {
    const storage = await this.store()
    await storage.deleteFile(id)
  }

  async saveProfile(patch: Partial<Profile>): Promise<Profile> {
    const storage = await this.store()
    const current = (await this.read()).profile
    const next = Profile.parse({ ...current, ...patch, id: current.id, updatedAt: nowMs() })
    await storage.putSingleton(PROFILE_KEY, next)
    return next
  }

  async saveTaxProfile(patch: Partial<TaxProfile>): Promise<TaxProfile> {
    const storage = await this.store()
    const current = (await this.read()).taxProfile
    const next = TaxProfile.parse({ ...current, ...patch, id: current.id, updatedAt: nowMs() })
    await storage.putSingleton(TAX_PROFILE_KEY, next)
    return next
  }

  /* Both replace every document record, so the files those records pointed at
     go too — otherwise they would sit in storage with nothing able to reach them. */
  async resetToDemo(): Promise<Snapshot> {
    await this.ready()
    await this.write(demoSnapshot())
    await (this.storage ?? new MemoryStorage()).clearFiles()
    return await this.read()
  }

  async clearEverything(): Promise<Snapshot> {
    await this.ready()
    await this.write(emptySnapshot())
    await (this.storage ?? new MemoryStorage()).clearFiles()
    return await this.read()
  }
}
