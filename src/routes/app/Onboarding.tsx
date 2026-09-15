import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { StageCard } from '@/components/ui/StageCard'
import { useData, useDerived } from '@/data/store/data'
import { STAGES } from '@/domain/journey'
import { formatCompact } from '@/lib/money'

/**
 * §9.1's companion — one question per screen with a progress bar, which is what
 * the "no complex forms" promise actually means. Six screens, then the stage
 * result: the single highest-leverage screen in the product, because it turns a
 * signup into someone with a position to defend.
 */
type Question = {
  id: string
  prompt: string
  options: string[]
}

/* §12 keeps the rupee symbol in one file, so the bands are numbers formatted here. */
const INCOME_BANDS: [number | null, number | null][] = [
  [null, 30_000],
  [30_000, 75_000],
  [75_000, 150_000],
  [150_000, null],
]

function bandOption(from: number | null, to: number | null): string {
  if (from === null) return `Under ${formatCompact(to)}`
  if (to === null) return `More than ${formatCompact(from)}`
  return `${formatCompact(from)} – ${formatCompact(to)}`
}

const QUESTIONS: Question[] = [
  {
    id: 'income',
    prompt: 'Roughly what comes in each month?',
    options: INCOME_BANDS.map(([from, to]) => bandOption(from, to)),
  },
  { id: 'savings', prompt: 'How much do you have set aside?', options: ['Nothing yet', 'Less than a month', 'A few months', 'Six months or more'] },
  { id: 'debt', prompt: 'Any loans running?', options: ['None', 'One', 'Two or three', 'More than three'] },
  { id: 'goal', prompt: 'What matters most right now?', options: ['Stop overspending', 'Build a cushion', 'Grow what I have', 'Plan for family'] },
  { id: 'horizon', prompt: 'How far are you thinking ahead?', options: ['This month', 'This year', 'Five years', 'A lifetime'] },
  { id: 'language', prompt: 'Which do you read more comfortably?', options: ['English', 'हिन्दी', 'Both'] },
]

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const derived = useDerived()
  const saveProfile = useData((state) => state.saveProfile)
  const navigate = useNavigate()

  const question = QUESTIONS[step]
  const done = question === undefined
  const stage = derived?.stage ?? STAGES[0] ?? null

  function choose(option: string): void {
    if (question === undefined) return
    setAnswers((previous) => ({ ...previous, [question.id]: option }))
    if (question.id === 'language') {
      void saveProfile({ language: option === 'हिन्दी' ? 'hi' : 'en' })
    }
    setStep((value) => value + 1)
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 py-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>
            {done ? 'Done' : `Question ${String(step + 1)} of ${String(QUESTIONS.length)}`}
          </SectionLabel>
          {done ? null : (
            <span className="text-caption text-text-3">
              {Math.round((step / QUESTIONS.length) * 100)}%
            </span>
          )}
        </div>
        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${String(((done ? QUESTIONS.length : step) / QUESTIONS.length) * 100)}%` }}
          />
        </span>
      </div>

      {done ? (
        <Card>
          <div className="text-center">
            <span className="inline-flex rounded-full bg-gold-dim p-2">
              <Check aria-hidden className="size-5 text-text" />
            </span>
            <h1 className="mt-3 text-balance font-semibold text-page text-text">
              You are starting at {stage?.name ?? 'the beginning'}
            </h1>
            <p className="mt-2 text-sm text-text-2">
              {stage?.tagline ?? 'Everyone starts somewhere.'} There are{' '}
              {String(STAGES.length - (stage?.index ?? 1))} stages above you, ending at{' '}
              {formatCompact(STAGES[STAGES.length - 1]?.bandFrom ?? 0)}.
            </p>
          </div>

          <div className="mx-auto mt-5 max-w-[240px]">
            {stage === null ? null : (
              <StageCard
                index={stage.index}
                name={stage.name}
                tagline={stage.tagline}
                wealthBand=""
                icon={stage.icon}
                tier={stage.tier}
                state="current"
                progress={derived?.stageProgress ?? 0}
              />
            )}
          </div>

          <div className="mt-6">
            <AppButton
              block
              onClick={() => {
                void navigate('/app/dashboard')
              }}
            >
              Open my dashboard
              <ArrowRight aria-hidden className="size-4" />
            </AppButton>
          </div>
        </Card>
      ) : (
        <Card>
          <h1 className="text-balance font-semibold text-title text-text">{question.prompt}</h1>
          <div className="mt-5 space-y-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  choose(option)
                }}
                className="w-full rounded-tile border border-border bg-surface px-4 py-3.5 text-left text-sm text-text transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-text-2 focus-visible:outline-offset-2"
              >
                {option}
              </button>
            ))}
          </div>
          {step === 0 ? null : (
            <button
              type="button"
              onClick={() => {
                setStep((value) => Math.max(0, value - 1))
              }}
              className="mt-4 rounded-tile text-caption text-text-2 underline underline-offset-2 hover:text-text"
            >
              Back
            </button>
          )}
          <p className="sr-only">{Object.keys(answers).length} answered</p>
        </Card>
      )}
    </div>
  )
}
