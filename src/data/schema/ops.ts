import { z } from 'zod'

import { baseFields, IsoDate, Timestamp } from './common'

export const DocumentKind = z.enum([
  'insurance-policy',
  'premium-receipt',
  'tax',
  'investment',
  'loan',
  'identity',
  'will',
  'other',
])
export type DocumentKind = z.infer<typeof DocumentKind>

/**
 * Where a record stands on its way to the WRC team.
 *
 * `local` never leaves the phone. `queued` is waiting for the server to exist
 * (src/config/server.ts) or for a connection; `sent` has been handed over. There
 * is no server yet, so today nothing moves past `queued` — the field exists so
 * that switching one on is a config change, not a data migration.
 */
export const Delivery = z.enum(['local', 'queued', 'sent'])
export type Delivery = z.infer<typeof Delivery>

/** One thing read off a document — "Policy number: 12345678". */
export const ScanField = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
})
export type ScanField = z.infer<typeof ScanField>

/** What the on-device scan found in a document. */
export const DocumentScan = z.object({
  /** `pdf-text` read a digital PDF's own text; `ocr` read pixels. */
  method: z.enum(['pdf-text', 'ocr']),
  scannedAt: Timestamp,
  fields: z.array(ScanField),
  /**
   * The words on the page, capped (domain/docscan.ts). Kept so search finds a
   * document by what it says, not only by what it was named.
   */
  text: z.string(),
})
export type DocumentScan = z.infer<typeof DocumentScan>

export const DocumentRecord = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: DocumentKind,
  sizeBytes: z.number().int().nonnegative(),
  uploadedOn: IsoDate,
  tags: z.array(z.string()),
  /*
   * Everything below arrived with upload and scanning. Each is defaulted so the
   * records saved before them — the demo schedule, anything already on a phone —
   * still parse rather than being dropped as unreadable.
   */
  mimeType: z.string().default(''),
  /** The stored file's key in the repository's file store. Null: no file kept. */
  fileId: z.string().nullable().default(null),
  scan: DocumentScan.nullable().default(null),
  delivery: Delivery.default('local'),
})
export type DocumentRecord = z.infer<typeof DocumentRecord>

/** §9.3 — a submitted Request Centre form. Created without an account. */
export const RequestService = z.enum([
  'insurance-review',
  'unlisted-shares',
  'msi-review',
  'pre-ipo',
  /** A Silver member asking to move to Diamond. Approved by the WRC team. */
  'diamond-upgrade',
])
export type RequestService = z.infer<typeof RequestService>

export const RequestStatus = z.enum(['submitted', 'in-review', 'closed'])
export type RequestStatus = z.infer<typeof RequestStatus>

export const RequestTicket = z.object({
  ...baseFields,
  reference: z.string().min(1),
  service: RequestService,
  status: RequestStatus,
  submittedAt: Timestamp,
  /** The answered form, kept opaque so each service can evolve its own questions. */
  answers: z.record(z.string(), z.unknown()),
  /** §9.3 — consent is explicit and recorded with the moment it was given. */
  consentGivenAt: Timestamp,
  /**
   * A request is written *to* the WRC team, so unlike a document it is queued by
   * default — and a request saved before this field existed was too.
   */
  delivery: Delivery.default('queued'),
})
export type RequestTicket = z.infer<typeof RequestTicket>

export const ChatRole = z.enum(['user', 'assistant', 'expert'])
export type ChatRole = z.infer<typeof ChatRole>

export const ChatMessage = z.object({
  ...baseFields,
  threadId: z.string().min(1),
  role: ChatRole,
  body: z.string(),
  sentAt: Timestamp,
})
export type ChatMessage = z.infer<typeof ChatMessage>

export const ChatThread = z.object({
  ...baseFields,
  title: z.string().min(1),
  /** 'assistant' threads are the deterministic in-app helper; 'expert' are Diamond-gated. */
  channel: z.enum(['assistant', 'expert']),
  lastMessageAt: Timestamp,
})
export type ChatThread = z.infer<typeof ChatThread>

export const FamilyRelation = z.enum(['spouse', 'child', 'parent', 'sibling', 'other'])
export type FamilyRelation = z.infer<typeof FamilyRelation>

export const FamilyMember = z.object({
  ...baseFields,
  name: z.string().min(1),
  relation: FamilyRelation,
  /** Whether this member's finances roll up into the household totals. */
  includeInHousehold: z.boolean(),
  /*
   * Defaulted, so the members saved before these fields existed still parse.
   */
  dateOfBirth: IsoDate.nullable().default(null),
  /** Relies on this household's money — what cover and emergency targets are sized for. */
  dependent: z.boolean().default(false),
  /** Anything worth remembering: school, health cover, their own income. */
  notes: z.string().default(''),
})
export type FamilyMember = z.infer<typeof FamilyMember>
