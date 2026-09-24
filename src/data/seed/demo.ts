import { FIRST_STAGE_ID } from '../../domain/journey'
import { DEFAULT_CATEGORY_NAMES, newId, nowMs, type Profile, type TaxProfile } from '../schema'
import type { Collections, Snapshot } from '../repo/types'

/**
 * §8.3 — a realistic Indian household, so no screen is ever empty on a fresh
 * install and §12's "seed data visible on every screen" check can pass.
 *
 * The figures are deliberately *unflattering*: ₹15.7 L of home loan against
 * ₹2.5 L of assets puts net worth at −₹18.1 L. A demo that opens on a healthy
 * balance sheet teaches the user nothing about what the product is for, and it
 * hides exactly the negative-figure rendering path §4.1 had to fix a contrast
 * bug for.
 *
 * Everything here is fictional and clearly labelled as demo data in Settings.
 */

const DAY = 86_400_000

function iso(offsetDays: number): string {
  const date = new Date(Date.now() - offsetDays * DAY)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function stamp<T extends object>(
  prefix: string,
  value: T,
): T & {
  id: string
  createdAt: number
  updatedAt: number
} {
  const at = nowMs()
  return { ...value, id: newId(prefix), createdAt: at, updatedAt: at }
}

export function demoProfile(): Profile {
  return stamp('prof', {
    displayName: 'Demo User',
    tier: 'silver' as const,
    stageId: FIRST_STAGE_ID,
    language: 'en' as const,
    streakCount: 4,
    lastCheckInDate: iso(0),
    dashboardLayout: null,
    hiddenDashboardSections: [],
    avatar: null,
    phone: '',
  })
}

export function demoTaxProfile(): TaxProfile {
  return stamp('tax', {
    regime: 'new' as const,
    annualGrossIncome: 1_020_000,
  })
}

export function demoSnapshot(): Snapshot {
  const categories: Collections['categories'][] = DEFAULT_CATEGORY_NAMES.map((name, index) =>
    stamp('cat', {
      name,
      icon: 'Circle',
      essential: index < 4,
    }),
  )

  const byName = (name: string): string =>
    categories.find((category) => category.name === name)?.id ?? ''

  const incomeSources: Collections['incomeSources'][] = [
    stamp('inc', {
      name: 'Salary',
      kind: 'salary' as const,
      amount: 85_000,
      cadence: 'monthly' as const,
      active: true,
    }),
    stamp('inc', {
      name: 'Freelance design',
      kind: 'freelance' as const,
      amount: 18_000,
      cadence: 'quarterly' as const,
      active: true,
    }),
  ]

  /* Three complete months of spending, so §8.4's average has a real window. */
  const spendPlan: { category: string; amount: number; recurring: boolean }[] = [
    { category: 'Rent', amount: 24_000, recurring: true },
    { category: 'Groceries', amount: 11_400, recurring: false },
    { category: 'Utilities', amount: 3_200, recurring: true },
    { category: 'Transport', amount: 4_800, recurring: false },
    { category: 'Eating Out', amount: 5_600, recurring: false },
    { category: 'Subscriptions', amount: 1_450, recurring: true },
    { category: 'Family Support', amount: 8_000, recurring: true },
    { category: 'Shopping', amount: 3_100, recurring: false },
  ]

  const transactions: Collections['transactions'][] = []
  for (let monthsAgo = 0; monthsAgo < 3; monthsAgo += 1) {
    for (const entry of spendPlan) {
      const drift = 1 + (monthsAgo % 2 === 0 ? 0.04 : -0.03) * (entry.recurring ? 0 : 1)
      transactions.push(
        stamp('txn', {
          date: iso(monthsAgo * 30 + 6),
          kind: 'expense' as const,
          amount: Math.round(entry.amount * drift),
          categoryId: byName(entry.category),
          note: entry.category,
          fromQuickAdd: false,
          recurring: entry.recurring,
        }),
      )
    }
    transactions.push(
      stamp('txn', {
        date: iso(monthsAgo * 30 + 1),
        kind: 'income' as const,
        amount: 85_000,
        categoryId: null,
        note: 'Salary',
        fromQuickAdd: false,
        recurring: true,
      }),
    )
  }

  const budgets: Collections['budgets'][] = spendPlan.map((entry) =>
    stamp('bud', {
      categoryId: byName(entry.category),
      monthlyLimit: Math.round(entry.amount * 1.1),
    }),
  )

  const liabilities: Collections['liabilities'][] = [
    stamp('lia', {
      name: 'Home loan',
      kind: 'home' as const,
      principal: 1_800_000,
      outstanding: 1_570_000,
      annualRate: 8.65,
      emi: 16_200,
      tenureRemaining: 158,
      startedOn: iso(1_100),
    }),
    stamp('lia', {
      name: 'Car loan',
      kind: 'car' as const,
      principal: 420_000,
      outstanding: 240_000,
      annualRate: 9.4,
      emi: 7_200,
      tenureRemaining: 36,
      startedOn: iso(700),
    }),
  ]

  const creditScores: Collections['creditScores'][] = [
    stamp('cib', { score: 742, recordedOn: iso(12) }),
    stamp('cib', { score: 736, recordedOn: iso(102) }),
    stamp('cib', { score: 728, recordedOn: iso(193) }),
  ]

  const assets: Collections['assets'][] = [
    stamp('ast', { name: 'Savings account', kind: 'bank' as const, value: 96_000, nominee: null }),
    stamp('ast', { name: 'Cash in hand', kind: 'cash' as const, value: 9_000, nominee: null }),
    stamp('ast', {
      name: 'Bank FD',
      kind: 'fixed-deposit' as const,
      value: 60_000,
      nominee: 'Spouse',
    }),
    stamp('ast', { name: 'Gold (family)', kind: 'gold' as const, value: 85_000, nominee: null }),
  ]

  const investments: Collections['investments'][] = [
    stamp('inv', {
      name: 'Index fund SIP',
      kind: 'mutual-fund' as const,
      units: 412.6,
      price: 214.4,
      invested: 78_000,
      current: 88_460,
      expenseRatio: 0.2,
      sip: true,
      cashflows: [
        { date: iso(540), amount: -26_000 },
        { date: iso(360), amount: -26_000 },
        { date: iso(180), amount: -26_000 },
      ],
    }),
    stamp('inv', {
      name: 'Flexi cap fund',
      kind: 'mutual-fund' as const,
      units: 188.2,
      price: 342.1,
      invested: 56_000,
      current: 64_383,
      expenseRatio: 1.71,
      sip: true,
      cashflows: [
        { date: iso(420), amount: -30_000 },
        { date: iso(150), amount: -26_000 },
      ],
    }),
    stamp('inv', {
      name: 'PPF',
      kind: 'ppf' as const,
      units: 0,
      price: 0,
      invested: 150_000,
      current: 163_500,
      expenseRatio: null,
      sip: false,
      cashflows: [
        { date: iso(760), amount: -75_000 },
        { date: iso(400), amount: -75_000 },
      ],
    }),
  ]

  const goals: Collections['goals'][] = [
    stamp('goal', {
      name: 'Emergency fund',
      target: 360_000,
      saved: 165_000,
      targetDate: iso(-420),
      milestones: [0.25, 0.5, 0.75, 1],
      active: true,
    }),
    stamp('goal', {
      name: 'Car down payment',
      target: 250_000,
      saved: 40_000,
      targetDate: iso(-700),
      milestones: [0.5, 1],
      active: true,
    }),
  ]

  const policies: Collections['policies'][] = [
    stamp('pol', {
      name: 'Term cover',
      kind: 'term' as const,
      insurer: 'Demo Life',
      cover: 5_000_000,
      annualPremium: 14_200,
      renewsOn: iso(-210),
    }),
    stamp('pol', {
      name: 'Family health',
      kind: 'family-floater' as const,
      insurer: 'Demo Health',
      cover: 500_000,
      annualPremium: 21_800,
      renewsOn: iso(-64),
    }),
  ]

  const learning: Collections['learning'][] = [
    stamp('mod', {
      title: 'Where your money actually goes',
      stageId: 'clarity',
      durationMinutes: 12,
      progress: 1,
      completed: true,
    }),
    stamp('mod', {
      title: 'Reading your own balance sheet',
      stageId: 'clarity',
      durationMinutes: 18,
      progress: 0.4,
      completed: false,
    }),
    stamp('mod', {
      title: 'Finding the leaks',
      stageId: 'leaks',
      durationMinutes: 15,
      progress: 0,
      completed: false,
    }),
  ]

  const checkIns: Collections['checkIns'][] = [0, 1, 2, 3].map((daysAgo) =>
    stamp('chk', { date: iso(daysAgo), note: '' }),
  )

  const stageTasks: Collections['stageTasks'][] = [
    stamp('stk', { stageId: 'clarity', taskId: 'clarity.income', completedOn: iso(20) }),
    stamp('stk', { stageId: 'clarity', taskId: 'clarity.expenses', completedOn: iso(14) }),
    stamp('stk', { stageId: 'clarity', taskId: 'clarity.debts', completedOn: iso(9) }),
  ]

  const achievements: Collections['achievements'][] = [
    stamp('ach', {
      title: 'First rupee tracked',
      description: 'You logged your first transaction.',
      icon: 'Sparkles',
      earnedOn: iso(21),
      progress: 1,
    }),
    stamp('ach', {
      title: 'Seven-day streak',
      description: 'Check in seven days running.',
      icon: 'Flame',
      earnedOn: null,
      progress: 4 / 7,
    }),
    stamp('ach', {
      title: 'Debt free',
      description: 'Clear every loan on your books.',
      icon: 'Award',
      earnedOn: null,
      progress: 0,
    }),
  ]

  const referrals: Collections['referrals'][] = [
    stamp('ref', {
      name: 'A. Sharma',
      status: 'signed-up' as const,
      invitedOn: iso(30),
      rewardEarned: 0,
    }),
  ]

  const documents: Collections['documents'][] = [
    stamp('doc', {
      name: 'Term policy schedule.pdf',
      kind: 'insurance-policy' as const,
      sizeBytes: 482_000,
      uploadedOn: iso(45),
      tags: ['term', 'demo'],
      mimeType: 'application/pdf',
      /* A demo row with no file behind it — the list says so rather than
         offering to open something that is not there. */
      fileId: null,
      scan: null,
      delivery: 'local' as const,
    }),
  ]

  const family: Collections['family'][] = [
    stamp('fam', {
      name: 'Spouse',
      relation: 'spouse' as const,
      includeInHousehold: true,
      dateOfBirth: null,
      dependent: false,
      notes: '',
    }),
  ]

  const deductions: Collections['deductions'][] = [
    stamp('ded', { section: '80C' as const, label: 'PPF contribution', amount: 75_000 }),
    stamp('ded', { section: '80D' as const, label: 'Family health premium', amount: 21_800 }),
  ]

  return {
    profile: demoProfile(),
    taxProfile: demoTaxProfile(),
    incomeSources,
    categories,
    transactions,
    budgets,
    liabilities,
    creditScores,
    assets,
    investments,
    goals,
    policies,
    deductions,
    stageTasks,
    checkIns,
    learning,
    achievements,
    referrals,
    documents,
    requests: [],
    chatThreads: [],
    chatMessages: [],
    family,
  }
}

/** §8.3 — Clear everything. Empty collections, and a profile that still renders. */
export function emptySnapshot(): Snapshot {
  return {
    profile: {
      ...demoProfile(),
      displayName: 'You',
      streakCount: 0,
      lastCheckInDate: null,
    },
    taxProfile: { ...demoTaxProfile(), annualGrossIncome: 0 },
    incomeSources: [],
    categories: [],
    transactions: [],
    budgets: [],
    liabilities: [],
    creditScores: [],
    assets: [],
    investments: [],
    goals: [],
    policies: [],
    deductions: [],
    stageTasks: [],
    checkIns: [],
    learning: [],
    achievements: [],
    referrals: [],
    documents: [],
    requests: [],
    chatThreads: [],
    chatMessages: [],
    family: [],
  }
}
