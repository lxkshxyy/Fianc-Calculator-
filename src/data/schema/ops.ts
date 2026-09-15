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

export const DocumentRecord = z.object({
  ...baseFields,
  name: z.string().min(1),
  kind: DocumentKind,
  sizeBytes: z.number().int().nonnegative(),
  uploadedOn: IsoDate,
  tags: z.array(z.string()),
})
export type DocumentRecord = z.infer<typeof DocumentRecord>

/** §9.3 — a submitted Request Centre form. Created without an account. */
export const RequestService = z.enum([
  'insurance-review',
  'unlisted-shares',
  'msi-review',
  'pre-ipo',
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
})
export type FamilyMember = z.infer<typeof FamilyMember>
