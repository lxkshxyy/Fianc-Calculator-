import type {
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
  Profile,
  Referral,
  RequestTicket,
  StageTaskCompletion,
  TaxProfile,
  Transaction,
} from '../schema'

/**
 * §8.1 — the boundary. Screens talk only to Zustand selectors; Zustand talks
 * only to this interface; no component imports Dexie. When a real backend
 * arrives, `repo/` is the only directory that changes.
 */

export type Collections = {
  incomeSources: IncomeSource
  categories: Category
  transactions: Transaction
  budgets: Budget
  liabilities: Liability
  creditScores: CreditScore
  assets: Asset
  investments: Investment
  goals: Goal
  policies: InsurancePolicy
  deductions: DeductionEntry
  stageTasks: StageTaskCompletion
  checkIns: CheckIn
  learning: LearningModule
  achievements: Achievement
  referrals: Referral
  documents: DocumentRecord
  requests: RequestTicket
  chatThreads: ChatThread
  chatMessages: ChatMessage
  family: FamilyMember
}

export type CollectionName = keyof Collections

export const COLLECTION_NAMES: CollectionName[] = [
  'incomeSources',
  'categories',
  'transactions',
  'budgets',
  'liabilities',
  'creditScores',
  'assets',
  'investments',
  'goals',
  'policies',
  'deductions',
  'stageTasks',
  'checkIns',
  'learning',
  'achievements',
  'referrals',
  'documents',
  'requests',
  'chatThreads',
  'chatMessages',
  'family',
]

/** Everything the app needs in one read. Local data is small; paging it buys nothing. */
export type Snapshot = {
  profile: Profile
  taxProfile: TaxProfile
} & { [K in CollectionName]: Collections[K][] }

/** The fields the repository fills in, so callers never invent an id or a timestamp. */
export type Draft<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

export type Patch<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

export interface Repository {
  /** Resolves once storage is open and seeded. Never rejects — see §2.1.6. */
  ready(): Promise<void>
  read(): Promise<Snapshot>
  create<K extends CollectionName>(name: K, draft: Draft<Collections[K]>): Promise<Collections[K]>
  update<K extends CollectionName>(
    name: K,
    id: string,
    patch: Patch<Collections[K]>,
  ): Promise<Collections[K] | null>
  remove<K extends CollectionName>(name: K, id: string): Promise<void>
  /**
   * The bytes behind a document, kept apart from the record.
   *
   * Records are read in full on every refresh (`read()` above), which is fine for
   * rows of text and would not be for a folder of scanned PDFs. Files are only
   * ever fetched one at a time, when somebody opens one.
   */
  putFile(id: string, file: Blob): Promise<void>
  getFile(id: string): Promise<Blob | null>
  removeFile(id: string): Promise<void>
  saveProfile(patch: Partial<Profile>): Promise<Profile>
  saveTaxProfile(patch: Partial<TaxProfile>): Promise<TaxProfile>
  /** §8.3 — restore the demo household. */
  resetToDemo(): Promise<Snapshot>
  /** §8.3 — wipe everything and leave usable empty states, not a crash. */
  clearEverything(): Promise<Snapshot>
}
