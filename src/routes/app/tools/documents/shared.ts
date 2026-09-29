import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  type LucideIcon,
  Receipt,
  ScrollText,
  Shield,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { APP_BASE } from '@/app/nav/navigation'
import type { DocumentKind, ScanField } from '@/data/schema'
import type { ImportSection } from '@/domain/docimport'

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
  'salary-slip': 'Salary slip',
  tax: 'Tax document',
  investment: 'Investment statement',
  loan: 'Loan document',
  'bank-statement': 'Bank statement',
  identity: 'ID proof',
  will: 'Will',
  other: 'Other',
}

export const KIND_ICON: Record<DocumentKind, LucideIcon> = {
  'insurance-policy': ShieldCheck,
  'premium-receipt': Receipt,
  'salary-slip': Banknote,
  tax: Landmark,
  investment: TrendingUp,
  loan: ScrollText,
  'bank-statement': Building2,
  identity: BadgeCheck,
  will: ScrollText,
  other: FileText,
}

/** Where each kind of imported record lives, named and drawn as the menu has it. */
export const SECTION: Record<ImportSection, { label: string; path: string; icon: LucideIcon }> = {
  insurance: { label: 'Insurance', path: `${APP_BASE}/insurance`, icon: Shield },
  income: { label: 'Income', path: `${APP_BASE}/income`, icon: Banknote },
  investments: { label: 'Investments', path: `${APP_BASE}/investments`, icon: TrendingUp },
  loans: { label: 'EMI & Credit', path: `${APP_BASE}/emi-credit`, icon: CreditCard },
  tax: { label: 'Tax Planning', path: `${APP_BASE}/tax`, icon: Receipt },
  budget: { label: 'Budget', path: `${APP_BASE}/budget`, icon: Wallet },
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
