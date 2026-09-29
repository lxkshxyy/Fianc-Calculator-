import type { CollectionName, Collections, Draft, Patch, Snapshot } from '../data/repo/types'
import type {
  DeductionSection,
  DocumentKind,
  InvestmentKind,
  LoanKind,
  PolicyKind,
  ScanField,
  TransactionKind,
} from '../data/schema'
import { formatFull } from '../lib/money'
import { displayDateToIso, normaliseText, parseAmountText, parseDate, parseMonths } from './docscan'
import { monthsToClear } from './loan'

/**
 * From a read document to the records it belongs in.
 *
 * docscan.ts reads a page into details ("Sum assured ₹50,00,000"). This takes
 * those details — as the person has checked and corrected them — and works out
 * where they go in the app: a policy schedule becomes a policy on Insurance, a
 * salary slip the salary on Income, a fund statement one holding per scheme on
 * Investments, a loan letter a loan on EMI & Credit, a Form 16 the yearly income
 * and deductions on Tax Planning, a bank statement the month's spending on
 * Budget.
 *
 * Pure: text and details in, a plan out. Nothing is written here. The upload
 * sheet shows the plan, the person can untick any line, and only then does the
 * data store carry it out (applyImport).
 *
 * ── Updating rather than duplicating ────────────────────────────────────────
 * The same policy uploaded twice, or this month's salary slip after last
 * month's, should change the record that is already there, not add a second
 * one that doubles every total. Each plan looks for its match first — same
 * insurer and kind of cover, same employer, same fund, same lender — and says
 * plainly when a line updates rather than adds.
 */

export type ImportSection = 'insurance' | 'income' | 'investments' | 'loans' | 'tax' | 'budget'

type CreateOf<K extends CollectionName> = {
  op: 'create'
  collection: K
  draft: Draft<Collections[K]>
}
type UpdateOf<K extends CollectionName> = {
  op: 'update'
  collection: K
  id: string
  patch: Patch<Collections[K]>
}

export type ImportAction =
  | { [K in CollectionName]: CreateOf<K> }[CollectionName]
  | { [K in CollectionName]: UpdateOf<K> }[CollectionName]
  | { op: 'tax-profile'; patch: { annualGrossIncome: number } }

export type ImportItem = {
  /** Stable within one plan, for the tick box. */
  key: string
  section: ImportSection
  title: string
  detail: string
  /** True when this changes a record already in the app rather than adding one. */
  updates: boolean
  actions: ImportAction[]
}

/** What a plan needs to know about the app to update rather than duplicate. */
export type ImportContext = Pick<
  Snapshot,
  | 'policies'
  | 'incomeSources'
  | 'investments'
  | 'liabilities'
  | 'transactions'
  | 'deductions'
  | 'categories'
  | 'taxProfile'
>

export type ImportInput = {
  /** The full text read off the document — not the capped copy a record keeps. */
  text: string
  kind: DocumentKind
  /** The details as the person left them in the review step. */
  fields: ScanField[]
  /** YYYY-MM-DD. Passed in so the plan is the same in a test on any day. */
  today: string
}

/* ------------------------------------------------------------------ *
 * Small readers
 * ------------------------------------------------------------------ */

function fieldValue(fields: ScanField[], key: string): string | null {
  const value = fields.find((field) => field.key === key)?.value.trim()
  return value === undefined || value === '' ? null : value
}

/** "₹50,00,000" → 5000000. Reads what the review step shows, edits included. */
export function moneyOf(value: string | null): number | null {
  if (value === null) return null
  const cleaned = value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '')
  const number = Number(cleaned)
  return cleaned !== '' && Number.isFinite(number) && number > 0 ? number : null
}

/** "15 Mar 2027", "15/03/2027" or "2027-03-15" → "2027-03-15". */
export function isoOf(value: string | null): string | null {
  if (value === null) return null
  const display = parseDate(value)
  return display === null ? null : displayDateToIso(display)
}

/** "2027-03-15" → "15 Mar 2027", for the plan's own lines. */
function readable(iso: string): string {
  return parseDate(iso) ?? iso
}

function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1 + months, day ?? 1)
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole months from `from` to `to`, never negative. */
function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  const months = ((ty ?? 0) - (fy ?? 0)) * 12 + ((tm ?? 0) - (fm ?? 0))
  return Math.max(0, months)
}

/** The next yearly anniversary of `start` that is today or later. */
function nextAnniversary(start: string, today: string): string {
  let next = start
  for (let guard = 0; next < today && guard < 200; guard += 1) next = addMonths(next, 12)
  return next
}

function simplify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "Demo Life" and "demo life insurance" are the same issuer; "SBI" and "SBI Life" are not the same kind. */
export function sameName(a: string, b: string): boolean {
  const left = simplify(a)
  const right = simplify(b)
  if (left === '' || right === '') return false
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = shorter === left ? right : left
  return shorter.length >= 5 && ` ${longer} `.includes(` ${shorter} `)
}

function joined(parts: (string | null | false)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' · ')
}

/* ------------------------------------------------------------------ *
 * Insurance
 * ------------------------------------------------------------------ */

const POLICY_NAME: Record<PolicyKind, string> = {
  term: 'term cover',
  health: 'health cover',
  'family-floater': 'family health cover',
  'critical-illness': 'critical illness cover',
  accident: 'accident cover',
  other: 'policy',
}

export function policyKindOf(text: string): PolicyKind {
  if (/\bfloater\b/i.test(text)) return 'family-floater'
  if (
    /\bterm\s*(?:plan|insurance|assurance|policy|protect\w*|cover|life)\b|\bpure\s*(?:term|protection)\b/i.test(
      text,
    )
  ) {
    return 'term'
  }
  if (/critical\s*illness/i.test(text) && !/\bhealth\b|mediclaim/i.test(text)) {
    return 'critical-illness'
  }
  if (/\bhealth\b|mediclaim|hospitali[sz]ation/i.test(text)) return 'health'
  if (/personal\s*accident|accident\s*(?:cover|policy|insurance)/i.test(text)) return 'accident'
  return 'other'
}

const PAYMENTS_A_YEAR: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  'half-yearly': 2,
}

function planPolicy(input: ImportInput, context: ImportContext): ImportItem[] {
  const { fields, text, today } = input
  const cover = moneyOf(fieldValue(fields, 'cover'))
  const premium = moneyOf(fieldValue(fields, 'premium'))
  if (cover === null && premium === null) return []

  const insurer = fieldValue(fields, 'provider') ?? fieldValue(fields, 'insurer') ?? 'Insurer'
  const kind = policyKindOf(text)
  const mode = (fieldValue(fields, 'premiumMode') ?? '').toLowerCase()
  const annualPremium = premium === null ? null : premium * (PAYMENTS_A_YEAR[mode] ?? 1)
  const issued = isoOf(fieldValue(fields, 'issued'))
  const renewsOn =
    isoOf(fieldValue(fields, 'due')) ??
    (issued === null ? addMonths(today, 12) : nextAnniversary(issued, today))

  const existing = context.policies.find(
    (policy) => policy.kind === kind && sameName(policy.insurer, insurer),
  )
  const detail = joined([
    cover !== null && `${formatFull(cover)} cover`,
    annualPremium !== null && `${formatFull(annualPremium)} a year`,
    `renews ${readable(renewsOn)}`,
  ])

  if (existing !== undefined) {
    return [
      {
        key: 'insurance:0',
        section: 'insurance',
        title: existing.name,
        detail,
        updates: true,
        actions: [
          {
            op: 'update',
            collection: 'policies',
            id: existing.id,
            patch: {
              ...(cover === null ? {} : { cover }),
              ...(annualPremium === null ? {} : { annualPremium }),
              renewsOn,
            },
          },
        ],
      },
    ]
  }

  const name = `${insurer} ${POLICY_NAME[kind]}`
  return [
    {
      key: 'insurance:0',
      section: 'insurance',
      title: name,
      detail,
      updates: false,
      actions: [
        {
          op: 'create',
          collection: 'policies',
          draft: {
            name,
            kind,
            insurer,
            cover: cover ?? 0,
            annualPremium: annualPremium ?? 0,
            renewsOn,
          },
        },
      ],
    },
  ]
}

/** A premium receipt is money spent: one line on Budget. */
function planReceipt(input: ImportInput, context: ImportContext): ImportItem[] {
  const { fields, today } = input
  const amount = moneyOf(fieldValue(fields, 'premium')) ?? moneyOf(fieldValue(fields, 'amount'))
  if (amount === null) return []
  const date = isoOf(fieldValue(fields, 'issued')) ?? today
  const insurer = fieldValue(fields, 'provider') ?? fieldValue(fields, 'insurer')
  const note = insurer === null ? 'Insurance premium' : `Insurance premium — ${insurer}`
  const already = context.transactions.some(
    (txn) => txn.kind === 'expense' && txn.date === date && Math.abs(txn.amount - amount) < 0.5,
  )
  if (already) return []
  return [
    {
      key: 'budget:0',
      section: 'budget',
      title: 'Premium paid',
      detail: joined([`${formatFull(amount)} on ${readable(date)}`, insurer]),
      updates: false,
      actions: [
        {
          op: 'create',
          collection: 'transactions',
          draft: {
            date,
            kind: 'expense',
            amount,
            categoryId: null,
            note,
            fromQuickAdd: false,
            recurring: false,
          },
        },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ *
 * Salary
 * ------------------------------------------------------------------ */

/**
 * The salary a new figure belongs to: the one named after this employer, or —
 * because most people have one job — the only salary there is.
 */
function salaryMatch(context: ImportContext, employer: string | null) {
  const salaries = context.incomeSources.filter((source) => source.kind === 'salary')
  if (employer !== null) {
    const named = salaries.find((source) => sameName(source.name, employer))
    if (named !== undefined) return named
  }
  return salaries.length === 1 ? salaries[0] : undefined
}

function salaryItem(
  context: ImportContext,
  employer: string | null,
  monthly: number,
  note: string,
): ImportItem {
  const existing = salaryMatch(context, employer)
  const detail = joined([
    `${formatFull(monthly)} a month`,
    note,
    existing !== undefined && existing.amount !== monthly && `was ${formatFull(existing.amount)}`,
  ])
  if (existing !== undefined) {
    return {
      key: 'income:0',
      section: 'income',
      title: existing.name,
      detail,
      updates: true,
      actions: [
        {
          op: 'update',
          collection: 'incomeSources',
          id: existing.id,
          patch: { amount: monthly, cadence: 'monthly', active: true },
        },
      ],
    }
  }
  const name = employer === null ? 'Salary' : `Salary — ${employer}`
  return {
    key: 'income:0',
    section: 'income',
    title: name,
    detail,
    updates: false,
    actions: [
      {
        op: 'create',
        collection: 'incomeSources',
        draft: { name, kind: 'salary', amount: monthly, cadence: 'monthly', active: true },
      },
    ],
  }
}

function planSalarySlip(input: ImportInput, context: ImportContext): ImportItem[] {
  const { fields } = input
  const gross = moneyOf(fieldValue(fields, 'grossPay'))
  const net = moneyOf(fieldValue(fields, 'netPay'))
  const monthly = gross ?? net
  if (monthly === null) return []
  const employer = fieldValue(fields, 'employer')
  const note =
    gross === null
      ? 'take-home'
      : joined(['before tax', net !== null && `${formatFull(net)} take-home`])
  return [salaryItem(context, employer, monthly, note)]
}

/* ------------------------------------------------------------------ *
 * Tax (Form 16)
 * ------------------------------------------------------------------ */

const DEDUCTION_KEYS: { key: string; section: DeductionSection; label: string }[] = [
  { key: 'ded80C', section: '80C', label: '80C' },
  { key: 'ded80D', section: '80D', label: '80D' },
  { key: 'ded80CCD1B', section: '80CCD1B', label: '80CCD(1B)' },
  { key: 'ded80TTA', section: '80TTA', label: '80TTA' },
]

function planForm16(input: ImportInput, context: ImportContext): ImportItem[] {
  const { fields } = input
  const items: ImportItem[] = []
  const gross = moneyOf(fieldValue(fields, 'grossSalary'))
  const year = fieldValue(fields, 'assessmentYear')
  const employer = fieldValue(fields, 'employer')

  if (gross !== null) {
    const was = context.taxProfile.annualGrossIncome
    items.push({
      key: 'tax:0',
      section: 'tax',
      title: 'Yearly income for tax',
      detail: joined([
        `${formatFull(gross)} gross salary`,
        year !== null && `AY ${year}`,
        was > 0 && was !== gross && `was ${formatFull(was)}`,
      ]),
      updates: was > 0,
      actions: [{ op: 'tax-profile', patch: { annualGrossIncome: gross } }],
    })
    /* The salary itself, if Income has none yet — Form 16 gives the year, Income wants the month. */
    if (!context.incomeSources.some((source) => source.kind === 'salary')) {
      items.push(salaryItem(context, employer, Math.round(gross / 12), 'a twelfth of the year'))
    }
  }

  const label = year === null ? 'Form 16' : `Form 16 — AY ${year}`
  const actions: ImportAction[] = []
  const parts: string[] = []
  let updates = false
  for (const entry of DEDUCTION_KEYS) {
    const amount = moneyOf(fieldValue(fields, entry.key))
    if (amount === null) continue
    parts.push(`${entry.label} ${formatFull(amount)}`)
    const existing = context.deductions.find(
      (deduction) => deduction.section === entry.section && deduction.label === label,
    )
    if (existing !== undefined) {
      updates = true
      actions.push({ op: 'update', collection: 'deductions', id: existing.id, patch: { amount } })
    } else {
      actions.push({
        op: 'create',
        collection: 'deductions',
        draft: { section: entry.section, label, amount },
      })
    }
  }
  if (actions.length > 0) {
    items.push({
      key: 'tax:1',
      section: 'tax',
      title: 'Tax deductions',
      detail: parts.join(' · '),
      updates,
      actions,
    })
  }
  return items
}

/* ------------------------------------------------------------------ *
 * Loans
 * ------------------------------------------------------------------ */

const LOAN_NAME: Record<LoanKind, string> = {
  home: 'Home loan',
  car: 'Car loan',
  personal: 'Personal loan',
  education: 'Education loan',
  'credit-card': 'Credit card',
  other: 'Loan',
}

export function loanKindOf(text: string): LoanKind {
  if (/\bhome\s*loan\b|\bhousing\s*(?:loan|financ\w*)\b|\bmortgage\b/i.test(text)) return 'home'
  if (/\b(?:car|vehicle|auto|two[\s-]*wheeler)\s*loan\b/i.test(text)) return 'car'
  if (/\b(?:education|student)\s*loan\b/i.test(text)) return 'education'
  if (/\bpersonal\s*loan\b/i.test(text)) return 'personal'
  if (/\bcredit\s*card\b/i.test(text)) return 'credit-card'
  return 'other'
}

function planLoan(input: ImportInput, context: ImportContext): ImportItem[] {
  const { fields, text, today } = input
  const principal = moneyOf(fieldValue(fields, 'loanAmount'))
  const owed = moneyOf(fieldValue(fields, 'outstanding'))
  const emi = moneyOf(fieldValue(fields, 'emi'))
  if (principal === null && owed === null) return []
  const outstanding = owed ?? principal ?? 0
  const rateText = fieldValue(fields, 'rate')
  const rate = rateText === null ? null : Number(/(\d{1,2}(?:\.\d{1,3})?)/.exec(rateText)?.[1])
  const annualRate = rate !== null && Number.isFinite(rate) && rate <= 100 ? rate : null
  const startedOn =
    isoOf(fieldValue(fields, 'loanStart')) ?? isoOf(fieldValue(fields, 'issued')) ?? today

  /* Months left: printed, or the full term less the months already paid, or worked out from the EMI. */
  const left = parseMonths(fieldValue(fields, 'tenureLeft') ?? '')
  const term = parseMonths(fieldValue(fields, 'tenure') ?? '')
  const fromTerm = term === null ? null : Math.max(0, term - monthsBetween(startedOn, today))
  const fromEmi =
    emi === null || annualRate === null ? null : monthsToClear(outstanding, annualRate, emi)
  const tenureRemaining = Math.round(left ?? fromTerm ?? fromEmi ?? 0)

  const kind = loanKindOf(text)
  const lender = fieldValue(fields, 'provider') ?? fieldValue(fields, 'lender')
  const sameKind = context.liabilities.filter((liability) => liability.kind === kind)
  const existing =
    (lender === null ? undefined : sameKind.find((l) => sameName(l.name, lender))) ??
    (sameKind.length === 1 ? sameKind[0] : undefined)

  const detail = joined([
    `${formatFull(outstanding)} still owed`,
    emi !== null && `EMI ${formatFull(emi)}`,
    annualRate !== null && `${String(annualRate)}%`,
    tenureRemaining > 0 && `${String(tenureRemaining)} months left`,
  ])

  if (existing !== undefined) {
    return [
      {
        key: 'loans:0',
        section: 'loans',
        title: existing.name,
        detail,
        updates: true,
        actions: [
          {
            op: 'update',
            collection: 'liabilities',
            id: existing.id,
            patch: {
              outstanding,
              ...(principal === null ? {} : { principal }),
              ...(emi === null ? {} : { emi }),
              ...(annualRate === null ? {} : { annualRate }),
              ...(tenureRemaining > 0 ? { tenureRemaining } : {}),
            },
          },
        ],
      },
    ]
  }

  const name = lender === null ? LOAN_NAME[kind] : `${LOAN_NAME[kind]} — ${lender}`
  return [
    {
      key: 'loans:0',
      section: 'loans',
      title: name,
      detail,
      updates: false,
      actions: [
        {
          op: 'create',
          collection: 'liabilities',
          draft: {
            name,
            kind,
            principal: Math.max(principal ?? outstanding, outstanding),
            outstanding,
            annualRate: annualRate ?? 0,
            emi: emi ?? 0,
            tenureRemaining,
            startedOn,
          },
        },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ *
 * Investment statements
 * ------------------------------------------------------------------ */

export type Holding = {
  name: string
  kind: InvestmentKind
  units: number | null
  nav: number | null
  invested: number | null
  value: number | null
  sip: boolean
}

/** A line that names a scheme: "Demo Flexi Cap Fund - Direct Plan - Growth". */
const SCHEME_LINE =
  /^(?!.*\b(?:total|statement|summary|portfolio|consolidated|folio\s*no)\b).*\b(?:fund|etf|scheme)\b.*$/i

const DATE_ANYWHERE =
  /\b\d{1,2}[\s./-]+(?:\d{1,2}|[A-Za-z]{3,9})[\s./,-]+(?:\d{4}|\d{2})\b|\b\d{4}-\d{2}-\d{2}\b/g

/** The number printed after a label, dates skipped so "NAV on 31-Aug-2026: 58.42" reads 58.42. */
function numberAfter(text: string, label: RegExp): number | null {
  const match = label.exec(text)
  if (match === null) return null
  const rest = text.slice(match.index + match[0].length, match.index + match[0].length + 40)
  const found = /(?:₹|rs\.?|inr)?\s*[:.]?\s*(\d[\d,]*(?:\.\d+)?)/i.exec(rest)
  if (found?.[1] === undefined) return null
  const value = Number(found[1].replace(/,/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** One entry per scheme a fund statement lists, with whatever figures it prints for each. */
export function parseHoldings(raw: string): Holding[] {
  const lines = normaliseText(raw).split('\n')
  const blocks: { name: string; body: string[] }[] = []
  for (const line of lines) {
    const looksLikeName =
      SCHEME_LINE.test(line) && (line.match(/\d/g) ?? []).length <= 4 && line.length <= 110
    if (looksLikeName) {
      blocks.push({ name: line, body: [] })
    } else {
      blocks.at(-1)?.body.push(line)
    }
  }

  const holdings: Holding[] = []
  for (const block of blocks) {
    const body = block.body.join(' ').replace(DATE_ANYWHERE, ' ')
    const value = numberAfter(body, /\b(?:market|current)\s*value\b|\bvaluation\b/i)
    const invested = numberAfter(
      body,
      /\b(?:total\s*)?cost\s*(?:value)?\b|\b(?:amount\s*)?invested\b|\bpurchase\s*cost\b/i,
    )
    if (value === null && invested === null) continue
    const name = block.name
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 80)
    holdings.push({
      name,
      kind: /\bETF\b/i.test(name) ? 'etf' : 'mutual-fund',
      units: numberAfter(body, /\b(?:closing\s*)?units?(?:\s*balance)?\b/i),
      nav: numberAfter(body, /\bNAV\b/i),
      invested,
      value,
      sip: /\bSIP\b|systematic\s*investment/i.test(body),
    })
  }
  return holdings
}

function planHoldings(input: ImportInput, context: ImportContext): ImportItem[] {
  return parseHoldings(input.text).map((holding, index) => {
    const current = holding.value ?? holding.invested ?? 0
    const invested = holding.invested ?? current
    const units = holding.units ?? 0
    const price = holding.nav ?? (units > 0 ? current / units : 0)
    const existing = context.investments.find((investment) =>
      sameName(investment.name, holding.name),
    )
    const detail = joined([
      `${formatFull(current)} now`,
      `${formatFull(invested)} invested`,
      holding.units !== null &&
        `${holding.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })} units`,
      holding.sip && 'SIP',
    ])
    const key = `investments:${String(index)}`
    if (existing !== undefined) {
      return {
        key,
        section: 'investments' as const,
        title: existing.name,
        detail,
        updates: true,
        actions: [
          {
            op: 'update' as const,
            collection: 'investments' as const,
            id: existing.id,
            patch: { units, price, invested, current, sip: holding.sip || existing.sip },
          },
        ],
      }
    }
    return {
      key,
      section: 'investments' as const,
      title: holding.name,
      detail,
      updates: false,
      actions: [
        {
          op: 'create' as const,
          collection: 'investments' as const,
          draft: {
            name: holding.name,
            kind: holding.kind,
            units,
            price,
            invested,
            current,
            expenseRatio: null,
            sip: holding.sip,
            cashflows: [],
          },
        },
      ],
    }
  })
}

/* ------------------------------------------------------------------ *
 * Bank statements
 * ------------------------------------------------------------------ */

export type StatementRow = {
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
  balance: number | null
}

const ROW_START =
  /^(\d{1,2}[/.\- ](?:\d{1,2}|[A-Za-z]{3,9})[/.\- ,]*(?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2})\b\s*/
const AMOUNT_TOKEN = /(\d{1,3}(?:,\d{2,3})*\.\d{2}|\d+\.\d{2})(\s*(?:cr|dr)\b)?/gi
const MONEY_IN =
  /\bsalary\b|\bsal\s*cr\b|\bpayroll\b|\brefund\b|\bcashback\b|\binterest\s*(?:paid|credit)\b|\bint\.?\s*pd\b|\bdividend\b|\breceived\b|\bby\s*transfer\b|\bcredit\b/i
const NOT_A_ROW =
  /\b(?:opening|closing)\s*balance\b|\bb\/f\b|\bbrought\s*forward\b|\bcarried\s*forward\b/i

/**
 * The transactions a bank statement lists, one per dated row.
 *
 * Statements print a withdrawal column and a deposit column, and the empty one
 * disappears from the text — so which column a figure sat in is lost. The
 * running balance is not: whether it went up or down by that figure says which
 * way the money moved. A row the balance cannot settle falls back to a Cr/Dr
 * mark, then to the words ("SALARY", "REFUND").
 */
export function parseStatementRows(raw: string): StatementRow[] {
  const lines = normaliseText(raw).split('\n')
  const rows: StatementRow[] = []
  const openingLine = lines.find((line) => /\bopening\s*balance\b/i.test(line))
  let previous =
    openingLine === undefined
      ? null
      : parseAmountText(openingLine.replace(/^.*?opening\s*balance/i, ''))

  /* The row a wrapped line may belong to: only the one directly above it. */
  let wrapsInto: StatementRow | null = null
  for (const line of lines) {
    const start = ROW_START.exec(line)
    if (start?.[1] === undefined) {
      /*
       * A narration that wrapped onto a second line: words, no figures, right
       * under its row. Anything else — a page footer, the next page's letterhead
       * and column titles — ends the run, so it is never glued onto the last
       * transaction of the page before.
       */
      if (wrapsInto !== null && isWrappedNarration(line)) {
        wrapsInto.description = `${wrapsInto.description} ${line}`.trim().slice(0, 100)
      } else {
        wrapsInto = null
      }
      continue
    }
    const displayDate = parseDate(start[1])
    const date = displayDate === null ? null : displayDateToIso(displayDate)
    if (date === null) continue
    /* A second date straight after the first is the value date. */
    const rest = line.slice(start[0].length).replace(ROW_START, '')
    if (NOT_A_ROW.test(rest)) continue

    const tokens = [...rest.matchAll(AMOUNT_TOKEN)]
    if (tokens.length === 0) continue
    const numbers = tokens.map((token) => Number((token[1] ?? '').replace(/,/g, '')))
    const balance = tokens.length >= 2 ? (numbers.at(-1) ?? null) : null
    const figures = tokens.length >= 2 ? numbers.slice(0, -1) : numbers
    const amount = figures.filter((value) => value > 0).at(-1)
    if (amount === undefined || !Number.isFinite(amount)) continue
    const amountToken = tokens[numbers.lastIndexOf(amount)]
    const mark = (amountToken?.[2] ?? '').trim().toLowerCase()

    const description = rest
      .slice(0, tokens[0]?.index ?? rest.length)
      /* A value-date column in the middle of the row. */
      .replace(DATE_ANYWHERE, ' ')
      /* "A/C" is a word, not two; every other slash separates UPI parts. */
      .replace(/\ba\/c\b/gi, 'A\u2215C')
      .replace(/[_|/\\-]+/g, ' ')
      .replace(/\u2215/g, '/')
      .replace(/\b\S*\d{6,}\S*\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 80)

    let direction: 'in' | 'out'
    if (
      previous !== null &&
      balance !== null &&
      Math.abs(Math.abs(balance - previous) - amount) < 0.02
    ) {
      direction = balance > previous ? 'in' : 'out'
    } else if (mark === 'cr' || mark === 'dr') {
      direction = mark === 'cr' ? 'in' : 'out'
    } else {
      direction = MONEY_IN.test(description) ? 'in' : 'out'
    }
    if (balance !== null) previous = balance
    const row: StatementRow = {
      date,
      description: description === '' ? 'Bank transaction' : description,
      amount,
      direction,
      balance,
    }
    rows.push(row)
    wrapsInto = row
  }
  return rows
}

/** Letterhead, column titles and footers that sit between rows but are not part of any. */
const NOT_NARRATION =
  /\bpage\b|\btotal\b|\bstatement\b|\bbranch\b|\bnarration\b|\bbalance\b|\bspecimen\b|\bcontinued\b|\bifsc\b|\bbank\b.*\b(?:ltd|limited)\b/i

function isWrappedNarration(line: string): boolean {
  return (
    line.length <= 60 &&
    !/\d{2,}\.\d{2}/.test(line) &&
    !NOT_A_ROW.test(line) &&
    !NOT_NARRATION.test(line)
  )
}

/** Words a bank adds around a payer's name: channels, months, "salary", references. */
const NOT_A_NAME =
  /^(?:neft|imps|rtgs|upi|nach|ach|ecs|salary|sal|cr|dr|credit|trf|for|from|by|to|the|of|pvt|ltd|private|limited|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\S*\d\S*)$/i

/** "NEFT SALARY SEP 2026 DEMO TECH SOLUTIONS PVT LTD" → "Demo Tech Solutions". */
function payerOf(description: string): string | null {
  const words = description.split(/\s+/).filter((word) => word !== '' && !NOT_A_NAME.test(word))
  const name = words
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  return name.length >= 3 ? name : null
}

const CATEGORY_WORDS: [string, RegExp][] = [
  ['Rent', /\brent\b/i],
  ['Groceries', /grocer|bigbasket|blinkit|zepto|dmart|supermarket|kirana|\bmart\b/i],
  [
    'Utilities',
    /electric|\bbses\b|power|water\s*bill|\bgas\b|broadband|airtel|\bjio\b|vodafone|recharge|\bdth\b/i,
  ],
  ['Transport', /\buber\b|\bola\b|rapido|fuel|petrol|diesel|\bmetro\b|irctc|fastag|parking/i],
  ['Eating Out', /swiggy|zomato|restaurant|\bcafe\b|domino|pizza|mcdonald|starbucks|dining/i],
  ['Health', /pharma|chemist|hospital|clinic|apollo|medic|diagnostic|\b1mg\b|practo/i],
  ['Education', /school|college|tuition|course|udemy|coursera/i],
  ['Shopping', /amazon|flipkart|myntra|ajio|nykaa|meesho|\bmall\b/i],
  ['Entertainment', /bookmyshow|\bpvr\b|\binox\b|movie|cinema/i],
  ['Subscriptions', /netflix|spotify|prime\s*video|hotstar|youtube|apple\.com|subscription/i],
  ['Family Support', /\bmom\b|\bdad\b|mother|father|parents|family/i],
]

const RECURRING =
  /\brent\b|\bEMI\b|\bSIP\b|netflix|spotify|prime|hotstar|subscription|premium|salary|\bsal\b/i

function transactionKind(row: StatementRow): TransactionKind {
  if (row.direction === 'in') return 'income'
  if (
    /\bSIP\b|mutual\s*fund|\bMF\b|zerodha|groww|kuvera|\bNSE\b|\bBSE\b|\bPPF\b|\bNPS\b/i.test(
      row.description,
    )
  ) {
    return 'investment'
  }
  if (
    /self\s*transfer|\bto\s*self\b|own\s*a\/?c|credit\s*card\s*(?:bill|payment)/i.test(
      row.description,
    )
  ) {
    return 'transfer'
  }
  return 'expense'
}

function planStatement(input: ImportInput, context: ImportContext): ImportItem[] {
  const rows = parseStatementRows(input.text)
  if (rows.length === 0) return []
  const categoryId = (description: string): string | null => {
    const name = CATEGORY_WORDS.find(([, pattern]) => pattern.test(description))?.[0]
    if (name === undefined) return null
    return context.categories.find((category) => category.name === name)?.id ?? null
  }

  const actions: ImportAction[] = []
  let spent = 0
  let received = 0
  let skipped = 0
  for (const row of rows) {
    const kind = transactionKind(row)
    const already = context.transactions.some(
      (txn) =>
        txn.kind === kind && txn.date === row.date && Math.abs(txn.amount - row.amount) < 0.5,
    )
    if (already) {
      skipped += 1
      continue
    }
    if (kind === 'income') received += row.amount
    else if (kind !== 'transfer') spent += row.amount
    actions.push({
      op: 'create',
      collection: 'transactions',
      draft: {
        date: row.date,
        kind,
        amount: row.amount,
        categoryId: kind === 'expense' ? categoryId(row.description) : null,
        note: row.description,
        fromQuickAdd: false,
        recurring: RECURRING.test(row.description),
      },
    })
  }

  const items: ImportItem[] = []
  const period = fieldValue(input.fields, 'period')
  if (actions.length > 0) {
    items.push({
      key: 'budget:0',
      section: 'budget',
      title: `${String(actions.length)} transactions`,
      detail: joined([
        period,
        `${formatFull(spent)} out`,
        `${formatFull(received)} in`,
        skipped > 0 && `${String(skipped)} already in the app`,
      ]),
      updates: false,
      actions,
    })
  }

  /* A salary credit, when Income has no salary yet. It is the take-home, not the gross. */
  const salary = rows.find(
    (row) => row.direction === 'in' && /\bsalary\b|\bsal\b|payroll/i.test(row.description),
  )
  if (salary !== undefined && !context.incomeSources.some((source) => source.kind === 'salary')) {
    items.push(
      salaryItem(
        context,
        payerOf(salary.description),
        salary.amount,
        `take-home, credited ${readable(salary.date)}`,
      ),
    )
  }
  return items
}

/* ------------------------------------------------------------------ *
 * The plan
 * ------------------------------------------------------------------ */

/**
 * Everything this document can add to the app, one line per record (a whole
 * bank statement is one line), in the order the sections appear in the menu.
 * Empty for papers that are only kept, not counted — an ID proof, a will.
 */
export function planImport(input: ImportInput, context: ImportContext): ImportItem[] {
  switch (input.kind) {
    case 'insurance-policy':
      return planPolicy(input, context)
    case 'premium-receipt':
      return planReceipt(input, context)
    case 'salary-slip':
      return planSalarySlip(input, context)
    case 'tax':
      return planForm16(input, context)
    case 'investment':
      return planHoldings(input, context)
    case 'loan':
      return planLoan(input, context)
    case 'bank-statement':
      return planStatement(input, context)
    case 'identity':
    case 'will':
    case 'other':
      return []
  }
}
