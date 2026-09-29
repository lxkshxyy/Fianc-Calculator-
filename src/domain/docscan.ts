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
    kind: 'salary-slip',
    patterns: [
      /\b(?:pay|salary)\s*slip\b|\bpayslip\b/i,
      /\bnet\s*(?:pay|salary)\b|\btake[\s-]*home\b/i,
      /\bgross\s*(?:earnings|salary|pay)\b|\btotal\s*earnings\b/i,
      /^\s*basic(?:\s*(?:pay|salary))?\b(?!\s*sum)/im,
      /\bHRA\b|house\s*rent\s*allowance/i,
      /\bpay\s*period\b|\bsalary\s*for\s*(?:the\s*)?month\b|\bpay\s*date\b/i,
      /\btotal\s*deductions\b/i,
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
    kind: 'bank-statement',
    patterns: [
      /\b(?:account|bank)\s*statement\b|\bstatement\s*of\s*account\b/i,
      /\bopening\s*balance\b/i,
      /\bclosing\s*balance\b/i,
      /\bwithdrawals?\b|\bdebits?\b/i,
      /\bdeposits?\b|\bcredits?\b/i,
      /\bIFSC\b/,
      /\b(?:txn|transaction|value)\s*date\b/i,
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
  'salary-slip': 'salary slip',
  tax: 'tax document',
  investment: 'statement',
  loan: 'loan document',
  'bank-statement': 'statement',
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
   *
   * One stray symbol is allowed in front of it, because OCR often reads a
   * printed ₹ as "%", "=" or "?": a photographed "Sum Assured ₹50,00,000" came
   * back as "%50,00,000" and the cover was lost. The figure still has to be
   * printed like money, so this recovers amounts and never invents one.
   */
  const bare = /(?:^|[\s:])[%=?&]?((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{2})?)(\s*\/-)?/.exec(text)
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
/**
 * Where a name printed in a two-column block runs into the next label:
 * "Mr. Aarav Mehta Account No. 5010…" is a name followed by another field.
 */
const NAME_STOP =
  /\b(?:account|a\/c|acct|no|number|ifsc|customer|pan|mobile|phone|e-?mail|address|branch|period|type|currency|date|dob|policy|folio|nominee|relationship|designation|employee|code|id)\b/i

function tidyName(raw: string): string | null {
  const cleaned = (raw.split(NAME_STOP)[0] ?? '')
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

function providerIn(text: string): string | null {
  return PROVIDERS.find((entry) => entry.pattern.test(text))?.name ?? null
}

/**
 * The top of the first page, where the issuer's letterhead is: the lines above
 * the first dated row (a statement's transactions name other banks), and never
 * more than fifteen.
 */
function topOf(text: string): string {
  const lines = text.split('\n').slice(0, 15)
  const firstRow = lines.findIndex((line) =>
    /^\d{1,2}[/.\- ](?:\d{1,2}|[A-Za-z]{3,9})[/.\- ,]*(?:\d{4}|\d{2})\b/.test(line),
  )
  return (firstRow < 0 ? lines : lines.slice(0, firstRow)).join('\n')
}

/** Without UPI handles and email addresses: "zomato@hdfcbank" is a merchant's bank, not the issuer. */
function withoutHandles(text: string): string {
  return text.replace(/\S+@\S+/g, ' ')
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

  add('provider', 'Provider', providerIn(topOf(text)) ?? providerIn(withoutHandles(text)))

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

/* ------------------------------------------------------------------ *
 * Details that only make sense for one kind of paper
 * ------------------------------------------------------------------ */

/** "Pvt. Ltd.", "Limited", "LLP"… — the tail that marks a line as a company's name. */
const COMPANY_TAIL =
  /[\s,]+(?:pvt\.?|private|ltd\.?|limited|llp|inc\.?|co\.?|company|corporation)(?=[\s,.]|$)[\s\S]*$/i

/** "Demo Tech Solutions Pvt. Ltd." → "Demo Tech Solutions". */
function companyName(raw: string): string | null {
  const name = raw
    .replace(COMPANY_TAIL, '')
    .replace(/[^A-Za-z0-9&.' -]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    /* A logo's initial, read as a letter of its own in front of the name. */
    .replace(/^(?:[A-Za-z]\s+)+(?=\S{2})/, '')
  /* Three digits or more is an ID (a TAN, a PAN), not a name. */
  if (/(?:\d.*){3}/.test(name)) return null
  return name.length >= 3 && name.length <= 60 ? name : null
}

/** The first line near the top that is a company's name, optionally only one that matches `like`. */
function companyLine(lines: string[], like?: RegExp, unlike?: RegExp): string | null {
  for (const line of lines.slice(0, 20)) {
    if (!COMPANY_TAIL.test(line)) continue
    if (like !== undefined && !like.test(line)) continue
    if (unlike?.test(line) === true) continue
    const name = companyName(line)
    if (name !== null) return name
  }
  return null
}

/** "Demo Life Insurance Co. Ltd." → "Demo Life": what is printed before "Insurance". */
function insurerFrom(lines: string[]): string | null {
  for (const line of lines.slice(0, 20)) {
    const match =
      /^(.{2,40}?)\s+(?:general\s+|health\s+)?insurance\b.*(?:co\b|company|ltd|limited|corporation)/i.exec(
        line,
      )
    const name = match?.[1]
      ?.replace(/[^A-Za-z0-9&.' -]/g, ' ')
      .trim()
      .replace(/^(?:[A-Za-z]\s+)+(?=\S{2})/, '')
    if (name !== undefined && name.length >= 2) return name
  }
  return null
}

/** "240 months" → 240, "20 years" → 240. A bare number is read as months. */
export function parseMonths(text: string): number | null {
  const match = /(\d{1,3})\s*(months?|mths?|m\b|years?|yrs?|y\b)?/i.exec(text)
  if (match?.[1] === undefined) return null
  const value = Number(match[1])
  const unit = (match[2] ?? 'm').toLowerCase()
  const months = unit.startsWith('y') ? value * 12 : value
  return months > 0 && months <= 600 ? months : null
}

/** The last amount printed on a line — the "deductible" column rather than the "gross" one. */
function lastAmount(text: string): number | null {
  const all = [...text.matchAll(/(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{2})(?!\d)/g)]
  const raw = all.at(-1)?.[1]
  if (raw === undefined) return null
  const value = Number(raw.replace(/,/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

const DEDUCTION_SECTIONS: { key: string; label: string; pattern: RegExp }[] = [
  { key: 'ded80C', label: 'Section 80C', pattern: /\b80\s*C\b/i },
  { key: 'ded80CCD1B', label: 'Section 80CCD(1B)', pattern: /\b80\s*CCD\s*\(?\s*1\s*B\s*\)?/i },
  { key: 'ded80D', label: 'Section 80D', pattern: /\b80\s*D\b/i },
  { key: 'ded80TTA', label: 'Section 80TTA', pattern: /\b80\s*TTA\b/i },
]

const KIND_LABELS = {
  premiumMode: /\b(?:premium\s*)?(?:payment\s*)?mode(?:\s*of\s*payment)?\b/i,
  employer:
    /\b(?:name\s*(?:and\s*address\s*)?of\s*the\s*employer|employer(?:'s)?\s*name|company\s*name)\b/i,
  payPeriod:
    /\b(?:pay\s*period|pay\s*month|salary\s*(?:slip\s*)?for\s*(?:the\s*)?month(?:\s*of)?|month\s*of)\b/i,
  grossPay: /\b(?:gross\s*(?:earnings|salary|pay)|total\s*earnings)\b/i,
  netPay: /\b(?:net\s*(?:pay|salary|amount\s*payable)|take[\s-]*home(?:\s*pay)?)\b/i,
  grossSalary: /\b(?:gross\s*(?:total\s*)?(?:salary|income)|total\s*income)\b/i,
  taxDeducted: /\b(?:total\s*)?tax\s*deducted\b/i,
  loanAmount:
    /\b(?:loan\s*amount|sanctioned\s*amount|amount\s*sanctioned|disbursed\s*amount|amount\s*disbursed|principal\s*amount)\b/i,
  outstanding:
    /\b(?:principal\s*outstanding|outstanding\s*(?:principal|amount|balance|loan)|balance\s*outstanding|loan\s*outstanding)\b/i,
  emi: /\b(?:EMI(?:\s*amount)?|monthly\s*instal+ment)\b/i,
  tenureLeft: /\b(?:balance|remaining|residual)\s*tenure\b/i,
  tenure: /\b(?:loan\s*)?tenure\b|\bterm\s*of\s*(?:the\s*)?loan\b/i,
  loanStart:
    /\b(?:date\s*of\s*(?:disbursement|sanction)|disburs\w*\s*date|sanction\s*date|loan\s*start\s*date|first\s*EMI\s*date)\b/i,
  period: /\b(?:statement\s*period|period)\b/i,
  openingBalance: /\bopening\s*balance\b/i,
  closingBalance: /\bclosing\s*balance\b/i,
  totalValue:
    /\b(?:total\s*(?:portfolio\s*)?(?:market\s*)?value|portfolio\s*value|total\s*valuation)\b/i,
}

/** Keys a kind's own details make redundant: "Amount" says less than "Net pay". */
const SUPERSEDED_BY: Partial<Record<DocumentKind, string>> = {
  'salary-slip': 'amount',
  tax: 'amount',
  loan: 'amount',
  'bank-statement': 'amount',
  investment: 'amount',
}

/**
 * The details one kind of paper carries on top of the common ones: what a salary
 * slip, a Form 16, a loan letter or a bank statement needs for its figures to be
 * put to use elsewhere in the app (docimport.ts).
 */
export function kindFields(raw: string, kind: DocumentKind, common: ScanField[]): ScanField[] {
  const text = normaliseText(raw)
  const lines = text.split('\n')
  const fields: ScanField[] = []
  const has = (key: string): boolean =>
    common.some((field) => field.key === key) || fields.some((field) => field.key === key)
  function add(key: string, label: string, value: string | null): void {
    if (value === null || value.trim() === '' || has(key)) return
    fields.push({ key, label, value: value.trim() })
  }
  const money = (label: RegExp): string | null => {
    const value = firstOf(afterLabel(lines, label), parseAmountText)
    return value === null ? null : formatFull(value)
  }
  const provider = common.find((field) => field.key === 'provider')?.value ?? null

  if (kind === 'insurance-policy' || kind === 'premium-receipt') {
    if (provider === null) add('insurer', 'Insurer', insurerFrom(lines))
    const mode = firstOf(afterLabel(lines, KIND_LABELS.premiumMode), (candidate) => {
      const match = /\b(monthly|quarterly|half[-\s]?yearly|yearly|annual|single)\b/i.exec(candidate)
      if (match?.[1] === undefined) return null
      const word = match[1].toLowerCase().replace(/\s/g, '-')
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    add('premiumMode', 'Premium paid', mode)
  }

  if (kind === 'salary-slip' || kind === 'tax') {
    const employer =
      firstOf(afterLabel(lines, KIND_LABELS.employer), companyName) ??
      companyLine(lines, undefined, /\bbank\b|\binsurance\b/i)
    add('employer', 'Employer', employer)
  }

  if (kind === 'salary-slip') {
    const period = firstOf(afterLabel(lines, KIND_LABELS.payPeriod), (candidate) => {
      const match = /([A-Za-z]{3,9})[\s,'-]*(\d{4}|\d{2})\b/.exec(candidate)
      if (match?.[1] === undefined || match[2] === undefined) return null
      const index = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase() as (typeof MONTHS)[number])
      if (index < 0) return null
      return `${MONTH_LABEL[index] ?? ''} ${String(fourDigitYear(match[2]))}`
    })
    add('payPeriod', 'Pay period', period)
    add('grossPay', 'Gross pay (month)', money(KIND_LABELS.grossPay))
    add('netPay', 'Net pay (month)', money(KIND_LABELS.netPay))
  }

  if (kind === 'tax') {
    add('grossSalary', 'Gross salary (year)', money(KIND_LABELS.grossSalary))
    for (const section of DEDUCTION_SECTIONS) {
      /* The first line naming the section that also carries a figure — not a heading. */
      const value = firstOf(
        lines.filter((candidate) => section.pattern.test(candidate)),
        lastAmount,
      )
      add(section.key, section.label, value === null ? null : formatFull(value))
    }
    add('taxDeducted', 'Tax deducted (TDS)', money(KIND_LABELS.taxDeducted))
  }

  if (kind === 'loan') {
    if (provider === null) {
      add('lender', 'Lender', companyLine(lines, /\b(?:bank|financ\w*|housing|credit|capital)\b/i))
    }
    add('loanAmount', 'Loan amount', money(KIND_LABELS.loanAmount))
    add('outstanding', 'Still owed', money(KIND_LABELS.outstanding))
    add('emi', 'EMI', money(KIND_LABELS.emi))
    const months = (label: RegExp, among: string[]): string | null => {
      const value = firstOf(afterLabel(among, label), parseMonths)
      return value === null ? null : `${String(value)} months`
    }
    add('tenureLeft', 'Months left', months(KIND_LABELS.tenureLeft, lines))
    /* "Balance tenure" also says "tenure"; it is not the loan's full term. */
    const fullTerm = lines.filter((line) => !KIND_LABELS.tenureLeft.test(line))
    add('tenure', 'Tenure', months(KIND_LABELS.tenure, fullTerm))
    add('loanStart', 'Loan started', firstOf(afterLabel(lines, KIND_LABELS.loanStart), parseDate))
  }

  if (kind === 'bank-statement') {
    if (provider === null) add('bank', 'Bank', companyLine(lines, /\bbank\b/i))
    const period = firstOf(afterLabel(lines, KIND_LABELS.period), (candidate) => {
      const from = parseDate(candidate)
      if (from === null) return null
      const rest = candidate.slice(candidate.search(/\bto\b|\s-\s|\s–\s/i) + 1)
      const to = parseDate(rest)
      return to === null || to === from ? from : `${from} to ${to}`
    })
    add('period', 'Statement period', period)
    add('openingBalance', 'Opening balance', money(KIND_LABELS.openingBalance))
    add('closingBalance', 'Closing balance', money(KIND_LABELS.closingBalance))
  }

  if (kind === 'investment') {
    if (provider === null) {
      const house = lines
        .slice(0, 20)
        .map((line) => /^(?:[A-Za-z]\s+)*(.{2,40}?\bmutual\s*fund)\b/i.exec(line)?.[1] ?? null)
        .find((found) => found !== null)
      add('fundHouse', 'Fund house', house ?? null)
    }
    add('totalValue', 'Total value', money(KIND_LABELS.totalValue))
  }

  return fields
}

/* ------------------------------------------------------------------ *
 * Is this a financial document at all?
 * ------------------------------------------------------------------ */

/** Details that only a financial paper carries. */
const FINANCIAL_KEYS = new Set([
  'policyNumber',
  'folio',
  'loanAccount',
  'account',
  'cover',
  'premium',
  'amount',
  'rate',
  'assessmentYear',
])

/** Words money paperwork uses. A menu has prices; it does not have four of these. */
const FINANCE_WORDS: RegExp[] = [
  /₹|\brs\.?\s*\d|\binr\b|\brupees?\b/i,
  /\bamount\b/i,
  /\bbalance\b/i,
  /\bpremium\b|\binsur\w*\b|\bpolicy\b/i,
  /\bloan\b|\bemi\b/i,
  /\binterest\b/i,
  /\bsalary\b|\bwages?\b|\bearnings\b/i,
  /\btax\b|\bgst\b|\btds\b/i,
  /\bbank\b|\baccount\b|\bifsc\b/i,
  /\binvest\w*\b|\bmutual\s*fund\b|\bnav\b|\bunits\b/i,
  /\bcredit\b|\bdebit\b/i,
  /\binvoice\b|\breceipt\b/i,
  /\bpayments?\b|\bpaid\b|\bpayable\b|\bdue\b/i,
  /\bstatement\b/i,
]

/**
 * Whether the text read off a file is money paperwork — a policy, a statement, a
 * salary slip, a tax form, a loan letter — rather than a photo of anything else.
 *
 * A recognised kind is enough on its own. Otherwise it needs two financial
 * details, or four kinds of money words and a figure printed like money. ID
 * proofs and wills are kept: they are part of a household's financial papers
 * (KYC, succession), and the vault has always had a place for them.
 */
export function looksFinancial(raw: string, suggestion: ScanSuggestion): boolean {
  if (suggestion.kind !== 'other') return true
  if (suggestion.fields.filter((field) => FINANCIAL_KEYS.has(field.key)).length >= 2) return true
  const text = normaliseText(raw)
  const words = FINANCE_WORDS.filter((pattern) => pattern.test(text)).length
  const figure = /(?:₹|rs\.?|inr)\s*\d|\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/i.test(text)
  return words >= 4 && figure
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

/**
 * Tags a kind of paper can earn. Scoped by kind, so a bank statement with a home
 * loan EMI on it is not tagged "home loan", nor a Form 16 "health" for its 80D line.
 */
const KIND_TAGS: Partial<Record<DocumentKind, [RegExp, string][]>> = {
  'insurance-policy': [
    [/\bterm\b/i, 'term'],
    [/\bhealth\b|\bmediclaim\b/i, 'health'],
    [/\bmotor\b|\bvehicle\b|\bcar\s*insurance\b/i, 'motor'],
  ],
  'premium-receipt': [
    [/\bterm\b/i, 'term'],
    [/\bhealth\b|\bmediclaim\b/i, 'health'],
  ],
  loan: [
    [/\bhome\s*loan\b|\bhousing\s*loan\b/i, 'home loan'],
    [/\b(?:car|vehicle)\s*loan\b/i, 'car loan'],
  ],
  investment: [[/\bmutual\s*fund\b/i, 'mutual fund']],
  tax: [[/\bform\s*(?:no\.?\s*)?16\b/i, 'form 16']],
  'salary-slip': [[/./, 'salary slip']],
  'bank-statement': [[/./, 'bank statement']],
}

/** Short tags that make a document findable: who issued it and what sort it is. */
function suggestTags(text: string, fields: ScanField[], kind: DocumentKind): string[] {
  const tags = new Set<string>()
  const provider = fields.find((field) => field.key === 'provider')?.value
  if (provider !== undefined) tags.add(provider.toLowerCase())
  for (const [pattern, tag] of KIND_TAGS[kind] ?? []) if (pattern.test(text)) tags.add(tag)
  const year = fields.find((field) => field.key === 'assessmentYear')?.value
  if (year !== undefined) tags.add(`AY ${year}`)
  return [...tags].slice(0, 5)
}

/** Everything the review step pre-fills, from one pass over the text. */
export function suggestFromText(raw: string): ScanSuggestion {
  const text = normaliseText(raw)
  const kind = guessKind(text)
  /* A statement names other banks on every other line; only its letterhead says whose it is. */
  const common = extractFields(text).filter(
    (field) =>
      !(field.key === 'provider' && kind === 'bank-statement' && providerIn(topOf(text)) === null),
  )
  const own = kindFields(text, kind, common)
  const superseded = SUPERSEDED_BY[kind]
  const fields = [
    ...common.filter((field) => !(field.key === superseded && own.length > 0)),
    ...own,
  ]
  /* Named after who issued it: the insurer, lender or employer, when it says. */
  const issuer = ['provider', 'insurer', 'lender', 'employer', 'fundHouse', 'bank']
    .map((key) => fields.find((field) => field.key === key)?.value)
    .find((value) => value !== undefined)
  const name = issuer === undefined ? null : `${issuer} ${KIND_NAME[kind]}`
  return { fields, kind, tags: suggestTags(text, fields, kind), name }
}

/** Page text, trimmed to what a record keeps. */
export function keepText(raw: string): string {
  return normaliseText(raw).slice(0, MAX_KEPT_TEXT)
}
