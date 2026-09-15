import type { LucideIcon } from 'lucide-react'
import { Compass, Crown, Gem, Rocket, ShieldCheck, Sparkles } from 'lucide-react'

/**
 * §7 — the canonical ladder. One definition, imported by the marketing page and
 * the app alike. No screen may hardcode a stage name.
 *
 * The reference product ships two different ladders (six marketing levels, five
 * in-app stages); §7 resolves that to one list of six.
 *
 * NAMES AND TAGLINES ARE PROVISIONAL. §7 requires the client to supply the six
 * names, taglines and which stages are Diamond before Phase 4 ships. They are
 * marked by STAGE_COPY_PENDING so the UI can badge them, and they are the only
 * strings here — every threshold below is a number, formatted at render through
 * money.ts, because §12 allows the ₹ symbol in exactly one file.
 */
export const STAGE_COPY_PENDING = true

export type StageTier = 'silver' | 'diamond'

export type StageTask = {
  id: string
  label: string
  /** The module a user completes this task in, for deep-linking from the stage card. */
  moduleId: string
}

export type Stage = {
  id: string
  /** 1-based position on the ladder. */
  index: number
  name: string
  tagline: string
  /** Lower bound of the stage's net-worth band, in rupees. `null` on the first stage. */
  bandFrom: number | null
  /** Upper bound, in rupees. `null` on the last stage — it is open-ended. */
  bandTo: number | null
  icon: LucideIcon
  tier: StageTier
  /** Completing every task promotes the user to the next stage (§7). */
  checklist: StageTask[]
  /** Module ids this stage unlocks, matching the nav item paths in §5.1. */
  unlocks: string[]
}

export const STAGES: Stage[] = [
  {
    id: 'clarity',
    index: 1,
    name: 'Financial Clarity',
    tagline: 'Know where you stand',
    bandFrom: null,
    bandTo: 100_000,
    icon: Sparkles,
    tier: 'silver',
    checklist: [
      { id: 'clarity.income', label: 'Add every income source', moduleId: 'income' },
      { id: 'clarity.expenses', label: 'Log one month of expenses', moduleId: 'budget' },
      { id: 'clarity.assets', label: 'List what you own', moduleId: 'assets' },
      { id: 'clarity.debts', label: 'List what you owe', moduleId: 'emi-credit' },
    ],
    unlocks: ['income', 'budget', 'assets', 'emi-credit'],
  },
  {
    id: 'leaks',
    index: 2,
    name: 'Leak Detection',
    tagline: 'Find the money drains',
    bandFrom: 100_000,
    bandTo: 300_000,
    icon: Compass,
    tier: 'silver',
    checklist: [
      { id: 'leaks.budget', label: 'Set a limit on every category', moduleId: 'budget' },
      { id: 'leaks.recurring', label: 'Review recurring payments', moduleId: 'budget' },
      { id: 'leaks.emi', label: 'Check your EMI load', moduleId: 'emi-credit' },
    ],
    unlocks: ['income-opportunities'],
  },
  {
    id: 'stability',
    index: 3,
    name: 'Stability Mode',
    tagline: 'Build your safety net',
    bandFrom: 300_000,
    bandTo: 1_000_000,
    icon: ShieldCheck,
    tier: 'diamond',
    checklist: [
      { id: 'stability.fund', label: 'Reach six months of expenses in cash', moduleId: 'goals' },
      { id: 'stability.term', label: 'Hold term cover of 10x income', moduleId: 'insurance' },
      { id: 'stability.health', label: 'Hold a health policy', moduleId: 'insurance' },
    ],
    unlocks: ['insurance', 'goals'],
  },
  {
    id: 'optimisation',
    index: 4,
    name: 'Optimisation',
    tagline: 'Maximise every rupee',
    bandFrom: 1_000_000,
    bandTo: 5_000_000,
    icon: Rocket,
    tier: 'diamond',
    checklist: [
      { id: 'optimisation.regime', label: 'Compare both tax regimes', moduleId: 'tax' },
      { id: 'optimisation.deductions', label: 'Use your full 80C headroom', moduleId: 'tax' },
      { id: 'optimisation.prepay', label: 'Model a loan prepayment', moduleId: 'emi-credit' },
    ],
    unlocks: ['tax'],
  },
  {
    id: 'growth',
    index: 5,
    name: 'Wealth Build Mode',
    tagline: 'Grow what you keep',
    bandFrom: 5_000_000,
    bandTo: 10_000_000,
    icon: Gem,
    tier: 'diamond',
    checklist: [
      { id: 'growth.invest', label: 'Invest across four asset types', moduleId: 'investments' },
      { id: 'growth.sip', label: 'Automate a monthly investment', moduleId: 'investments' },
      { id: 'growth.fees', label: 'Review every expense ratio', moduleId: 'investments' },
    ],
    unlocks: ['investments'],
  },
  {
    id: 'legacy',
    index: 6,
    name: 'Legacy',
    tagline: 'Make it outlast you',
    bandFrom: 10_000_000,
    bandTo: null,
    icon: Crown,
    tier: 'diamond',
    checklist: [
      { id: 'legacy.nominees', label: 'Name a nominee on every holding', moduleId: 'assets' },
      { id: 'legacy.will', label: 'Record where your will is kept', moduleId: 'documents' },
      { id: 'legacy.family', label: 'Bring your family into the plan', moduleId: 'family' },
    ],
    unlocks: ['family'],
  },
]

export const FIRST_STAGE_ID = STAGES[0]?.id ?? 'clarity'

export function stageById(id: string): Stage | null {
  return STAGES.find((stage) => stage.id === id) ?? null
}

export function stageByIndex(index: number): Stage | null {
  return STAGES.find((stage) => stage.index === index) ?? null
}

/** Every task id on the ladder, for validating a stored completion record. */
export function allStageTaskIds(): string[] {
  return STAGES.flatMap((stage) => stage.checklist.map((task) => task.id))
}

/**
 * §7 — a user's stage is the highest one whose tasks are all complete, plus one.
 * Net worth positions them on the ladder visually; it does not promote them,
 * because a windfall is not the same as having done the work.
 */
export function deriveStageId(completedTaskIds: ReadonlySet<string>): string {
  let reached = STAGES[0]
  for (const stage of STAGES) {
    const done = stage.checklist.every((task) => completedTaskIds.has(task.id))
    if (!done) return stage.id
    reached = stage
  }
  return reached?.id ?? FIRST_STAGE_ID
}

/** Fraction of the current stage's checklist that is complete, or `null` if it has no tasks. */
export function stageProgress(stage: Stage, completedTaskIds: ReadonlySet<string>): number | null {
  const total = stage.checklist.length
  if (total === 0) return null
  const done = stage.checklist.filter((task) => completedTaskIds.has(task.id)).length
  return done / total
}

export type StageState = 'locked' | 'available' | 'current' | 'complete'

export function stageState(stage: Stage, currentStageId: string, tier: StageTier): StageState {
  const current = stageById(currentStageId)
  const currentIndex = current?.index ?? 1
  if (stage.index < currentIndex) return 'complete'
  if (stage.index === currentIndex) return 'current'
  if (stage.tier === 'diamond' && tier !== 'diamond') return 'locked'
  return 'available'
}

/**
 * §9.5 — which tier a module needs, derived from the stage that unlocks it.
 * One source, so gating cannot drift from the ladder the user was shown.
 */
export function moduleTier(moduleId: string): StageTier {
  const owner = STAGES.find((stage) => stage.unlocks.includes(moduleId))
  return owner?.tier ?? 'silver'
}
