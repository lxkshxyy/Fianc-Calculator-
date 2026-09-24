import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  FileText,
  Landmark,
  type LucideIcon,
  Receipt,
  ScrollText,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

import type { DocumentKind, ScanField } from '@/data/schema'

/** What the name/type/tags/details editor edits — the same shape on upload and later. */
export type DocumentDraft = {
  name: string
  kind: DocumentKind
  /** As typed: comma-separated. Split on save. */
  tags: string
  fields: ScanField[]
}

export const KIND_LABEL: Record<DocumentKind, string> = {
  'insurance-policy': 'Insurance policy',
  'premium-receipt': 'Premium receipt',
  tax: 'Tax document',
  investment: 'Investment statement',
  loan: 'Loan document',
  identity: 'ID proof',
  will: 'Will',
  other: 'Other',
}

export const KIND_ICON: Record<DocumentKind, LucideIcon> = {
  'insurance-policy': ShieldCheck,
  'premium-receipt': Receipt,
  tax: Landmark,
  investment: TrendingUp,
  loan: ScrollText,
  identity: BadgeCheck,
  will: ScrollText,
  other: FileText,
}

export const KIND_OPTIONS = (Object.keys(KIND_LABEL) as DocumentKind[]).map((value) => ({
  value,
  label: KIND_LABEL[value],
}))

export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`
}

/** "2026-09-24" → "24 Sep 2026". Falls back to the raw value rather than throwing. */
export function readableDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy')
  } catch {
    return iso
  }
}

/** "Policy schedule 2026.pdf" → "Policy schedule 2026". */
export function baseName(fileName: string): string {
  const trimmed = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').trim()
  return trimmed === '' ? 'Document' : trimmed.slice(0, 80)
}

export function splitTags(raw: string): string[] {
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const tag = part.trim()
    if (tag !== '') seen.add(tag.slice(0, 30))
  }
  return [...seen].slice(0, 10)
}

/** Fields with nothing in them are dropped on save rather than stored empty. */
export function keptFields(fields: ScanField[]): ScanField[] {
  return fields
    .map((field) => ({ ...field, label: field.label.trim(), value: field.value.trim() }))
    .filter((field) => field.label !== '' && field.value !== '')
}
