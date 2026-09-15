import type { Derived } from './derive'
import { HEALTH_BAND_LABEL } from './metrics'
import { EM_DASH, formatCompact, formatPercent } from '@/lib/money'

/**
 * §13 — a deterministic assistant. It matches intents against the user's own
 * derived figures and answers from them. No network, no model, no latency.
 *
 * It says "I cannot answer that yet" rather than guessing, because a finance
 * assistant that improvises is worse than one with a small, honest vocabulary.
 */

export type AssistantTurn = { role: 'user' | 'assistant'; body: string }

type Intent = { keywords: string[]; respond: (derived: Derived) => string }

const INTENTS: Intent[] = [
  {
    keywords: ['net worth', 'networth', 'worth'],
    respond: (derived) =>
      `Your net worth is ${formatCompact(derived.netWorth)} — ${formatCompact(derived.assetsTotal)} of assets against ${formatCompact(derived.liabilitiesTotal)} of debt.`,
  },
  {
    keywords: ['saving', 'save', 'savings rate'],
    respond: (derived) =>
      derived.savingsRate === null
        ? 'I cannot work out a savings rate until you record some income.'
        : `You are keeping ${formatPercent(derived.savingsRate)} of what you earn. ${derived.savingsRate >= 0.3 ? 'That is a strong rate.' : 'Thirty per cent is a good target.'}`,
  },
  {
    keywords: ['emi', 'loan', 'debt'],
    respond: (derived) =>
      `Your EMIs come to ${formatCompact(derived.monthlyEmiTotal)} a month, which is ${derived.debtToIncome === null ? EM_DASH : formatPercent(derived.debtToIncome)} of your income.`,
  },
  {
    keywords: ['emergency', 'fund', 'cushion'],
    respond: (derived) =>
      derived.emergencyFundMonths === null
        ? 'I need some recorded spending before I can say how long your cash would last.'
        : `Your reachable cash would cover about ${String(Math.round(derived.emergencyFundMonths * 10) / 10)} months of spending. Six is the usual target.`,
  },
  {
    keywords: ['health', 'score', 'how am i doing'],
    respond: (derived) =>
      derived.health.score === null || derived.health.band === null
        ? 'There is not enough entered yet to score your finances.'
        : `Your health score is ${String(derived.health.score)} out of 100 — ${HEALTH_BAND_LABEL[derived.health.band]}.`,
  },
  {
    keywords: ['fix', 'first', 'next', 'improve', 'should i'],
    respond: (derived) =>
      derived.health.weakest === null
        ? 'Add your income, spending and what you own, and I can tell you what to work on first.'
        : `Start with your ${derived.health.weakest.label.toLowerCase()}. ${derived.health.weakest.hint}`,
  },
  {
    keywords: ['invest', 'portfolio', 'returns'],
    respond: (derived) =>
      derived.portfolioValue === 0
        ? 'You have no holdings recorded yet.'
        : `Your holdings are worth ${formatCompact(derived.portfolioValue)} against ${formatCompact(derived.investedTotal)} invested, across ${String(derived.investmentTypeCount)} type${derived.investmentTypeCount === 1 ? '' : 's'}.`,
  },
  {
    keywords: ['goal', 'target'],
    respond: (derived) =>
      derived.goalsActive === 0
        ? 'You have no active goals. Naming one makes the monthly figure obvious.'
        : `You have ${String(derived.goalsActive)} active goal${derived.goalsActive === 1 ? '' : 's'}, ${derived.goalsProgress === null ? 'not yet started' : `${formatPercent(derived.goalsProgress)} funded overall`}.`,
  },
  {
    keywords: ['stage', 'level', 'journey'],
    respond: (derived) =>
      derived.stage === null
        ? 'I cannot tell which stage you are on yet.'
        : `You are on ${derived.stage.name} — ${derived.stage.tagline.toLowerCase()}. ${derived.stageProgress === null ? '' : `${formatPercent(derived.stageProgress)} of its tasks are done.`}`.trim(),
  },
]

export function answer(question: string, derived: Derived): string {
  const lower = question.toLowerCase()
  const intent = INTENTS.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)))
  if (intent === undefined) {
    return 'I can only answer from what you have entered — try asking about your net worth, savings, EMIs, goals, investments or what to fix first.'
  }
  return intent.respond(derived)
}
