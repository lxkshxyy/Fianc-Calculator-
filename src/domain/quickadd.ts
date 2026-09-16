import { parseAmount } from '@/lib/money'
import type { TransactionKind } from '@/data/schema'

/**
 * §9.2 — the natural-language quick add. Deterministic and rule-based.
 *
 * No model call. It has to work offline (§2.1.3) and it must never hang: a bar
 * at the top of the dashboard that sometimes takes four seconds to answer is
 * worse than one that never guesses at all.
 *
 * It returns a *draft*, never a write. §9.2 requires a confirm sheet with every
 * parsed field editable before anything reaches storage, and a failed parse
 * opens that same sheet pre-filled with whatever was understood — never an error
 * toast that discards what the user typed.
 */

export type QuickAddDraft = {
  kind: TransactionKind
  /** Null when no amount could be read. The sheet focuses this field when so. */
  amount: number | null
  /** Matched category name, or null. Resolved to an id by the caller. */
  categoryName: string | null
  note: string
  recurring: boolean
  /** Which parts were actually understood, so the sheet can highlight the gaps. */
  confidence: {
    kind: boolean
    amount: boolean
    category: boolean
  }
}

const EXPENSE_VERBS = [
  'paid',
  'pay',
  'spent',
  'spend',
  'bought',
  'buy',
  'gave',
  'sent',
  'ordered',
  'recharged',
  'booked',
]

const INCOME_VERBS = ['received', 'got', 'earned', 'salary', 'credited', 'refund', 'refunded']

const INVESTMENT_VERBS = ['invested', 'sip', 'bought shares', 'put into', 'deposited into']

/**
 * Keyword → category. First match wins, so longer, more specific phrases are
 * listed before the words they contain.
 */
const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['rent', 'landlord'], category: 'Rent' },
  {
    keywords: ['grocery', 'groceries', 'sabzi', 'vegetables', 'supermarket'],
    category: 'Groceries',
  },
  {
    keywords: ['electricity', 'water bill', 'gas bill', 'broadband', 'wifi', 'utility', 'bill'],
    category: 'Utilities',
  },
  {
    keywords: ['petrol', 'diesel', 'fuel', 'uber', 'ola', 'cab', 'metro', 'bus', 'auto', 'travel'],
    category: 'Transport',
  },
  {
    keywords: ['swiggy', 'zomato', 'restaurant', 'dinner', 'lunch', 'coffee', 'eating out'],
    category: 'Eating Out',
  },
  { keywords: ['doctor', 'medicine', 'pharmacy', 'hospital', 'medical'], category: 'Health' },
  { keywords: ['school', 'college', 'tuition', 'course', 'fees'], category: 'Education' },
  { keywords: ['clothes', 'shopping', 'amazon', 'flipkart', 'myntra'], category: 'Shopping' },
  { keywords: ['movie', 'cinema', 'game', 'concert'], category: 'Entertainment' },
  {
    keywords: ['netflix', 'spotify', 'prime', 'subscription', 'membership'],
    category: 'Subscriptions',
  },
  { keywords: ['mummy', 'papa', 'parents', 'family support', 'home'], category: 'Family Support' },
]

const RECURRING_HINTS = ['every month', 'monthly', 'each month', 'recurring', 'emi', 'subscription']

/**
 * Categories that are recurring by their nature. Rent and a streaming plan do
 * not stop being monthly because the user did not type "monthly", and getting
 * this right is what makes Budget's recurring-payment alerts useful without
 * asking the user to tag every line by hand.
 */
const RECURRING_CATEGORIES = new Set(['Rent', 'Subscriptions', 'Utilities'])

/** Matches the first amount-looking token: 15k, 1.5L, 2cr, 15,000, ₹15000, 850. */
const AMOUNT_TOKEN = /(?:₹\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?|l|crores?|cr)?\b/i

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle))
}

function detectKind(text: string): { kind: TransactionKind; matched: boolean } {
  if (includesAny(text, INVESTMENT_VERBS)) return { kind: 'investment', matched: true }
  if (includesAny(text, INCOME_VERBS)) return { kind: 'income', matched: true }
  if (includesAny(text, EXPENSE_VERBS)) return { kind: 'expense', matched: true }
  /* Unmatched defaults to expense — the overwhelmingly common case — but flags
     itself as a guess so the sheet can show the field as needing a look. */
  return { kind: 'expense', matched: false }
}

function detectCategory(text: string): string | null {
  for (const entry of CATEGORY_KEYWORDS) {
    if (includesAny(text, entry.keywords)) return entry.category
  }
  return null
}

function detectAmount(text: string): number | null {
  const match = AMOUNT_TOKEN.exec(text)
  if (match === null) return null
  const [, digits, suffix] = match
  if (digits === undefined) return null
  return parseAmount(`${digits}${suffix ?? ''}`)
}

/**
 * Builds the note by stripping the amount token and the matched verb, so
 * "paid 15k rent" leaves "rent" rather than repeating the whole input.
 */
function buildNote(original: string, category: string | null): string {
  const withoutAmount = original.replace(AMOUNT_TOKEN, ' ')
  const words = withoutAmount
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .filter((word) => ![...EXPENSE_VERBS, ...INCOME_VERBS].includes(word.toLowerCase()))
  const rebuilt = words.join(' ').replace(/\s+/g, ' ').trim()
  if (rebuilt.length > 0) return rebuilt
  return category ?? ''
}

export function parseQuickAdd(input: string): QuickAddDraft {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()

  const { kind, matched: kindMatched } = detectKind(lower)
  const amount = detectAmount(trimmed)
  const categoryName = kind === 'expense' ? detectCategory(lower) : null

  return {
    kind,
    amount,
    categoryName,
    note: buildNote(trimmed, categoryName),
    recurring:
      includesAny(lower, RECURRING_HINTS) ||
      (categoryName !== null && RECURRING_CATEGORIES.has(categoryName)),
    confidence: {
      kind: kindMatched,
      amount: amount !== null,
      category: categoryName !== null,
    },
  }
}

/** True when nothing at all was understood — the sheet then opens on an empty form. */
export function isEmptyDraft(draft: QuickAddDraft): boolean {
  return !draft.confidence.amount && !draft.confidence.kind && draft.note.length === 0
}
