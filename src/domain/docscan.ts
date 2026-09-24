import type { DocumentKind, ScanField } from '@/data/schema'
import { formatFull } from '@/lib/money'

/**
 * Reading a document's text into details a person would otherwise type.
 *
 * Pure: text in, fields out. The pixels-to-text half (OCR, PDF text) lives in
 * lib/scan and is the part that needs a browser; this half is plain string work,
 * so every rule here is covered by docscan.test.ts without one.
 *
 * ── What it looks for ───────────────────────────────────────────────────────
 * The details that come up when somebody actually needs the paper: the policy
 * or folio number for a claim, the cover, the premium, the date it renews, who
 * is insured and who the nominee is. Indian financial paperwork labels these
 * fairly consistently ("Policy No.", "Sum Assured", "Next Due Date"), so a label
 * followed by a value — on the same line or the one under it — finds most of
 * them, including through the noise OCR leaves behind.
 *
 * ── What it deliberately does not keep ──────────────────────────────────────
 * Bank account, Aadhaar and PAN numbers are shown as their last four only. They
 * are the details that do harm if they leak, a person never needs them read
 * back off a scan, and these records are headed for a server one day.
 *
 * Nothing here is authoritative. The review step shows every field for the
 * person to correct before anything is saved.
 */

/** Longest stretch of page text kept on a record, for search. */
export const MAX_KEPT_TEXT = 20_000

export type ScanSuggestion = {
  fields: ScanField[]
  kind: DocumentKind
  tags: string[]
  /** A readable name, or null when nothing better than the file name was found. */
  name: string | null
}

const RUPEE = '(?:\\u20b9|rs\\.?|inr|r5\\.?)'
const NUMBER = '[0-9][0-9,]*(?:\\.[0-9]{1,2})?'

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

const MONTH_LABEL = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Insurers, fund houses, banks and lenders, as they appear on paper → as a person says them. */
const PROVIDERS: { pattern: RegExp; name: string }[] = [
  { pattern: /\blife insurance corporation\b|\bLIC\b(?! ?housing)/i, name: 'LIC' },
  { pattern: /\bhdfc\s*life\b/i, name: 'HDFC Life' },
  { pattern: /\bhdfc\s*ergo\b/i, name: 'HDFC ERGO' },
  { pattern: /\bicici\s*pru(?:dential)?\b/i, name: 'ICICI Prudential' },
  { pattern: /\bicici\s*lombard\b/i, name: 'ICICI Lombard' },
  { pattern: /\bsbi\s*life\b/i, name: 'SBI Life' },
  { pattern: /\bsbi\s*general\b/i, name: 'SBI General' },
  { pattern: /\bmax\s*life\b|\baxis\s*max\s*life\b/i, name: 'Max Life' },
  { pattern: /\btata\s*aia\b/i, name: 'Tata AIA' },
  { pattern: /\btata\s*aig\b/i, name: 'Tata AIG' },
  { pattern: /\bbajaj\s*allianz\b/i, name: 'Bajaj Allianz' },
  { pattern: /\bstar\s*health\b/i, name: 'Star Health' },
  { pattern: /\bniva\s*bupa\b|\bmax\s*bupa\b/i, name: 'Niva Bupa' },
  { pattern: /\bcare\s*health\b|\breligare\s*health\b/i, name: 'Care Health' },
  { pattern: /\baditya\s*birla\b/i, name: 'Aditya Birla' },
  { pattern: /\bkotak\b/i, name: 'Kotak' },
  { pattern: /\bpnb\s*metlife\b/i, name: 'PNB MetLife' },
  { pattern: /\bnew\s*india\s*assurance\b/i, name: 'New India Assurance' },
  { pattern: /\bunited\s*india\s*insurance\b/i, name: 'United India Insurance' },
  { pattern: /\boriental\s*insurance\b/i, name: 'Oriental Insurance' },
  { pattern: /\bnational\s*insurance\b/i, name: 'National Insurance' },
  { pattern: /\bdigit\b.*\binsurance\b|\bgo\s*digit\b/i, name: 'Digit' },
  { pattern: /\backo\b/i, name: 'Acko' },
  { pattern: /\bsbi\s*(?:mutual|mf)\b/i, name: 'SBI Mutual Fund' },
  { pattern: /\bhdfc\s*(?:mutual|mf|asset)\b/i, name: 'HDFC Mutual Fund' },
  { pattern: /\bnippon\s*india\b/i, name: 'Nippon India' },
  { pattern: /\bparag\s*parikh\b|\bppfas\b/i, name: 'Parag Parikh' },
  { pattern: /\baxis\s*(?:mutual|mf)\b/i, name: 'Axis Mutual Fund' },
  { pattern: /\bmirae\b/i, name: 'Mirae Asset' },
  { pattern: /\bcams\b|\bcomputer age management\b/i, name: 'CAMS' },
  { pattern: /\bkfin\s*tech\b|\bkarvy\b/i, name: 'KFintech' },
  { pattern: /\bzerodha\b/i, name: 'Zerodha' },
  { pattern: /\bgroww\b/i, name: 'Groww' },
  { pattern: /\bstate bank of india\b|\bSBI\b/, name: 'SBI' },
  { pattern: /\bhdfc\s*bank\b/i, name: 'HDFC Bank' },
  { pattern: /\bicici\s*bank\b/i, name: 'ICICI Bank' },
  { pattern: /\baxis\s*bank\b/i, name: 'Axis Bank' },
  { pattern: /\bbajaj\s*finance\b/i, name: 'Bajaj Finance' },
  { pattern: /\bincome tax department\b/i, name: 'Income Tax Department' },
]

const KIND_SIGNALS: { kind: DocumentKind; patterns: RegExp[] }[] = [
  {
    kind: 'premium-receipt',
    patterns: [/premium\s*(?:paid\s*)?receipt/i, /renewal\s*premium\s*receipt/i, /\breceipt\b/i],
  },
  {
    kind: 'insurance-policy',
    patterns: [
      /policy\s*schedule/i,
      /sum\s*(?:assured|insured)/i,
      /policy\s*(?:no|number)/i,
      /\binsur(?:ance|ed|er)\b/i,
      /\bnominee\b/i,
    ],
  },
  {
    kind: 'tax',
    patterns: [
      /form\s*(?:no\.?\s*)?16\b/i,
      /\bassessment\s*year\b/i,
      /\bITR[- ]?\d?\b/,
      /\bTDS\b/,
      /\b26\s*AS\b/i,
      /income\s*tax\s*return/i,
    ],
  },
  {
    kind: 'investment',
    patterns: [
      /\bfolio\b/i,
      /mutual\s*fund/i,
      /\bNAV\b/,
      /\bunits\b/i,
      /\bSIP\b/,
      /\bdemat\b/i,
      /holding\s*statement/i,
      /capital\s*gains?/i,
    ],
  },
  {
    kind: 'loan',
    patterns: [
      /\bloan\b/i,
      /\bEMI\b/,
      /sanction\s*letter/i,
      /repayment\s*schedule/i,
      /principal\s*outstanding/i,
    ],
  },
  {
    kind: 'identity',
    patterns: [
      /permanent\s*account\s*number/i,
      /\baadhaar\b/i,
      /unique\s*identification/i,
      /\bpassport\b/i,
      /driving\s*licen[cs]e/i,
      /election\s*commission/i,
      /(?:govt\.?|government|republic|union)\s*of\s*india/i,
    ],
  },
  {
    kind: 'will',
    patterns: [/last\s*will/i, /\btestament\b/i, /\bexecutor\b/i, /\bbequeath/i],
  },
]

const KIND_NAME: Record<DocumentKind, string> = {
  'insurance-policy': 'policy',
  'premium-receipt': 'premium receipt',
  tax: 'tax document',
  investment: 'statement',
  loan: 'loan document',
  identity: 'ID',
  will: 'will',
  other: 'document',
}

/* ------------------------------------------------------------------ *
 * Small parsers
 * ------------------------------------------------------------------ */

/** OCR and PDF text both arrive with stray spacing; this is what every rule reads. */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\u00a0]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function validDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12 || day < 1 || year < 1900 || year > 2200) return false
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day
}

function fourDigitYear(raw: string): number {
  const year = Number(raw)
  if (raw.length === 4) return year
  /* Two-digit years on Indian paperwork are this century unless they obviously are not. */
  return year > 70 ? 1900 + year : 2000 + year
}

const DATE_PATTERN =
  '(\\d{1,2})[\\s./-]+(\\d{1,2}|[A-Za-z]{3,9})[\\s./,-]+(\\d{4}|\\d{2})\\b|(\\d{4})-(\\d{2})-(\\d{2})\\b|([A-Za-z]{3,9})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b'

/**
 * A date as a person reads it — "12 Mar 2026" — from any of the ways Indian
 * paperwork writes one. Numeric dates are read day-first (12/03/2026 is the
 * twelfth of March), which is the Indian convention and the only safe guess.
 * Null when the text is not a real calendar date.
 */
export function parseDate(text: string): string | null {
  const match = new RegExp(DATE_PATTERN).exec(text)
  if (match === null) return null

  let day: number
  let month: number
  let year: number

  if (match[4] !== undefined) {
    year = Number(match[4])
    month = Number(match[5])
    day = Number(match[6])
  } else if (match[7] !== undefined) {
    month = monthFromWord(match[7])
    day = Number(match[8])
    year = Number(match[9])
  } else {
    day = Number(match[1])
    const middle = match[2] ?? ''
    month = /^\d+$/.test(middle) ? Number(middle) : monthFromWord(middle)
    year = fourDigitYear(match[3] ?? '')
  }

  if (!validDate(day, month, year)) return null
  return `${pad(day)} ${MONTH_LABEL[month - 1] ?? ''} ${String(year)}`
}

function monthFromWord(word: string): number {
  const index = MONTHS.indexOf(word.slice(0, 3).toLowerCase() as (typeof MONTHS)[number])
  return index + 1
}

/** "12 Mar 2026" → "2026-03-12", for the one place a real date field is filled. */
export function displayDateToIso(display: string): string | null {
  const match = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(display)
  if (match === null) return null
  const month = MONTH_LABEL.indexOf(match[2] as (typeof MONTH_LABEL)[number]) + 1
  if (month === 0) return null
  return `${match[3] ?? ''}-${pad(month)}-${match[1] ?? ''}`
}

/**
 * The first rupee amount in a stretch of text, as a number.
 *
 * Wants either a currency marker or a figure big enough to be money — otherwise
 * "Policy term 20 years" would read as a twenty-rupee premium.
 */
export function parseAmountText(text: string): number | null {
  const marked = new RegExp(`${RUPEE}\\s*[:.]?\\s*(${NUMBER})`, 'i').exec(text)
  /*
   * Without a currency marker a figure has to be *printed* like money — grouped
   * with commas, carrying paise, or closed with "/-". A bare run of digits on
   * these papers is far more often a receipt or reference number.
   */
  const bare = /(?:^|[\s:])((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{2})?)(\s*\/-)?/.exec(text)
  const bareLooksLikeMoney =
    bare?.[1] !== undefined && (/[,.]/.test(bare[1]) || bare[2] !== undefined)
  const raw = marked?.[1] ?? (bareLooksLikeMoney ? bare?.[1] : undefined)
  if (raw === undefined) return null
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function lastFour(value: string): string {
  const digits = value.replace(/[^0-9A-Za-z]/g, '')
  return `\u2022\u2022\u2022\u2022 ${digits.slice(-4)}`
}

/** A name as printed, tidied: "MR. RAHUL  KUMAR" → "Rahul Kumar". */
function tidyName(raw: string): string | null {
  const cleaned = raw
    .replace(/^(?:mr|mrs|ms|miss|dr|shri|smt|kumari)\.?\s+/i, '')
    .replace(/[^A-Za-z .']/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const words = cleaned.split(' ').filter((word) => word.length > 0)
  if (words.length === 0 || words.length > 5 || cleaned.length < 3) return null
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

/* ------------------------------------------------------------------ *
 * Label → value
 * ------------------------------------------------------------------ */

/**
 * The text that follows a label: the rest of its line, or — only when the line
 * ends at the label, as it does in two-column layouts — the line under it.
 */
function afterLabel(lines: string[], label: RegExp): string[] {
  const found: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = label.exec(line)
    if (match === null) continue
    const rest = line
      .slice(match.index + match[0].length)
      .replace(/^[\s:.\-#)]+/, '')
      .trim()
    if (rest !== '') {
      found.push(rest)
      continue
    }
    const next = lines[index + 1]
    if (next !== undefined) found.push(next)
  }
  return found
}

function firstOf<T>(candidates: string[], read: (text: string) => T | null): T | null {
  for (const candidate of candidates) {
    const value = read(candidate)
    if (value !== null) return value
  }
  return null
}

function reference(text: string): string | null {
  const match = /^([A-Z0-9][A-Z0-9/-]{4,24})\b/i.exec(text)
  const value = match?.[1]
  if (value === undefined || !/\d/.test(value)) return null
  return value.toUpperCase()
}

const LABELS = {
  holder:
    /(?:name\s*of\s*(?:the\s*)?(?:policy\s*holder|proposer|insured|life\s*assured|assured|employee|investor|borrower|applicant|assessee|account\s*holder)|policy\s*holder(?:'s)?\s*name|proposer(?:'s)?\s*name|insured(?:'s)?\s*name|investor\s*name|customer\s*name|borrower\s*name|employee\s*name|applicant\s*name)\b/i,
  genericName: /^name\s*[:-]/i,
  policyNumber: /\bpolicy\s*(?:no|number|#)\b\.?/i,
  folio: /\bfolio\s*(?:no|number|#)?\b\.?/i,
  loanAccount: /\bloan\s*(?:account|a\/c)\s*(?:no|number|#)?\b\.?/i,
  bankAccount: /\b(?:bank\s*)?(?:account|a\/c)\s*(?:no|number|#)\b\.?/i,
  cover:
    /\b(?:sum\s*(?:assured|insured)|basic\s*sum\s*assured|cover(?:age)?\s*amount|total\s*cover)\b/i,
  premium:
    /\b(?:total\s*)?(?:annual\s*|installment\s*|instalment\s*|renewal\s*)?premium(?:\s*amount)?(?:\s*(?:paid|payable|received))?\b/i,
  amount:
    /\b(?:total\s*amount|amount\s*(?:paid|received|payable|due)|net\s*amount|grand\s*total|loan\s*amount|sanctioned\s*amount|emi\s*amount|market\s*value|current\s*value|total\s*value)\b/i,
  issued:
    /\b(?:date\s*of\s*(?:issue|commencement|risk\s*commencement|receipt)|issue\s*date|(?:policy\s*)?(?:start|commencement)\s*date|receipt\s*date|statement\s*date)\b/i,
  due: /\b(?:next\s*(?:premium\s*)?due\s*date|(?:renewal|due|expiry|maturity|end)\s*date|valid\s*(?:till|upto|up\s*to|until)|expires?\s*on|policy\s*(?:end|expiry)\s*date)\b/i,
  nominee: /\bnominee(?:\s*name)?\b/i,
  dob: /\b(?:date\s*of\s*birth|d\.?\s*o\.?\s*b\.?|birth\s*date)\b/i,
  assessmentYear: /\b(?:assessment\s*year|a\.?\s*y\.?)\s*[:-]?\s*/i,
  rate: /\b(?:rate\s*of\s*interest|interest\s*rate|roi)\b/i,
}

/**
 * Every detail this text yields, in the order a person would want to read them.
 */
export function extractFields(raw: string): ScanField[] {
  const text = normaliseText(raw)
  const lines = text.split('\n')
  const fields: ScanField[] = []

  function add(key: string, label: string, value: string | null): void {
    if (value === null || value.trim() === '') return
    if (fields.some((field) => field.key === key)) return
    fields.push({ key, label, value: value.trim() })
  }

  add('provider', 'Provider', PROVIDERS.find((entry) => entry.pattern.test(text))?.name ?? null)

  const holder =
    firstOf(afterLabel(lines, LABELS.holder), tidyName) ??
    firstOf(afterLabel(lines, LABELS.genericName), tidyName)
  add('holder', 'Name', holder)

  add('policyNumber', 'Policy number', firstOf(afterLabel(lines, LABELS.policyNumber), reference))
  add('folio', 'Folio number', firstOf(afterLabel(lines, LABELS.folio), reference))
  add('loanAccount', 'Loan account', firstOf(afterLabel(lines, LABELS.loanAccount), reference))
  if (!fields.some((field) => field.key === 'loanAccount')) {
    const account = firstOf(afterLabel(lines, LABELS.bankAccount), reference)
    add('account', 'Account number', account === null ? null : lastFour(account))
  }

  const money = (label: RegExp): string | null => {
    const value = firstOf(afterLabel(lines, label), parseAmountText)
    return value === null ? null : formatFull(value)
  }
  add('cover', 'Cover (sum assured)', money(LABELS.cover))
  add('premium', 'Premium', money(LABELS.premium))
  add('amount', 'Amount', money(LABELS.amount))

  const rate = firstOf(afterLabel(lines, LABELS.rate), (candidate) => {
    const match = /(\d{1,2}(?:\.\d{1,2})?)\s*%/.exec(candidate)
    return match?.[1] === undefined ? null : `${match[1]}% a year`
  })
  add('rate', 'Interest rate', rate)

  add('issued', 'Issued on', firstOf(afterLabel(lines, LABELS.issued), parseDate))
  add('due', 'Renews / due on', firstOf(afterLabel(lines, LABELS.due), parseDate))
  add('dob', 'Date of birth', firstOf(afterLabel(lines, LABELS.dob), parseDate))
  add('nominee', 'Nominee', firstOf(afterLabel(lines, LABELS.nominee), tidyName))

  const year = /\b(?:assessment\s*year|a\.?\s*y\.?)\s*[:-]?\s*(20\d{2})\s*-\s*(\d{2,4})\b/i.exec(
    text,
  )
  if (year?.[1] !== undefined && year[2] !== undefined) {
    add('assessmentYear', 'Assessment year', `${year[1]}-${year[2].slice(-2)}`)
  }

  const pan = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/.exec(text)
  add('pan', 'PAN', pan === null ? null : lastFour(pan[0]))
  const aadhaar = /\b[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/.exec(
    /\baadhaar\b|unique\s*identification/i.test(text) ? text : '',
  )
  add('aadhaar', 'Aadhaar', aadhaar === null ? null : lastFour(aadhaar[0]))

  return fields
}

/** The document type the text most looks like, or `other`. */
export function guessKind(raw: string): DocumentKind {
  const text = normaliseText(raw)
  let best: DocumentKind = 'other'
  let bestScore = 0
  for (const { kind, patterns } of KIND_SIGNALS) {
    const score = patterns.filter((pattern) => pattern.test(text)).length
    /* A receipt also mentions its policy; one clear "receipt" outranks that. */
    const weighted = kind === 'premium-receipt' && score > 0 ? score + 2 : score
    if (weighted > bestScore) {
      best = kind
      bestScore = weighted
    }
  }
  /* One matching word is a coincidence; two is a document. */
  return bestScore >= 2 ? best : 'other'
}

/** Short tags that make a document findable: who issued it and what sort it is. */
function suggestTags(text: string, fields: ScanField[]): string[] {
  const tags = new Set<string>()
  const provider = fields.find((field) => field.key === 'provider')?.value
  if (provider !== undefined) tags.add(provider.toLowerCase())
  const kinds: [RegExp, string][] = [
    [/\bterm\b/i, 'term'],
    [/\bhealth\b|\bmediclaim\b/i, 'health'],
    [/\bmotor\b|\bvehicle\b|\bcar\s*insurance\b/i, 'motor'],
    [/\bhome\s*loan\b|\bhousing\s*loan\b/i, 'home loan'],
    [/\bmutual\s*fund\b/i, 'mutual fund'],
    [/\bform\s*(?:no\.?\s*)?16\b/i, 'form 16'],
  ]
  for (const [pattern, tag] of kinds) if (pattern.test(text)) tags.add(tag)
  const year = fields.find((field) => field.key === 'assessmentYear')?.value
  if (year !== undefined) tags.add(`AY ${year}`)
  return [...tags].slice(0, 5)
}

/** Everything the review step pre-fills, from one pass over the text. */
export function suggestFromText(raw: string): ScanSuggestion {
  const text = normaliseText(raw)
  const fields = extractFields(text)
  const kind = guessKind(text)
  const provider = fields.find((field) => field.key === 'provider')?.value
  const name = provider === undefined ? null : `${provider} ${KIND_NAME[kind]}`
  return { fields, kind, tags: suggestTags(text, fields), name }
}

/** Page text, trimmed to what a record keeps. */
export function keepText(raw: string): string {
  return normaliseText(raw).slice(0, MAX_KEPT_TEXT)
}
