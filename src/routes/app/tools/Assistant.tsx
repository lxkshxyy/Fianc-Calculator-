import { Bot, Send } from 'lucide-react'
import { useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { useDerived } from '@/data/store/data'
import type { Derived } from '@/domain/derive'
import { answer, type AssistantTurn } from '@/domain/assistant'
import { ModuleScreen } from '../ModuleScreen'

/**
 * §13 — the AI Assistant is a deterministic shell. No model call in v1.
 *
 * It answers from the user's own figures, offline, instantly. A request that
 * hangs or errors is exactly the thing §2.1 exists to prevent, and wiring a
 * model in later is a feature flag, not a rewrite.
 */
export function Assistant() {
  const derived = useDerived()
  if (derived === null) return null
  return <AssistantChat derived={derived} />
}

function AssistantChat({ derived }: { derived: Derived }) {
  const [turns, setTurns] = useState<AssistantTurn[]>([])
  const [text, setText] = useState('')

  function send(): void {
    const question = text.trim()
    if (question.length === 0) return
    setTurns((previous) => [
      ...previous,
      { role: 'user', body: question },
      { role: 'assistant', body: answer(question, derived) },
    ])
    setText('')
  }

  return (
    <ModuleScreen
      title="AI Assistant"
      subtitle="Ask about your own numbers. It reads what you have entered — nothing leaves this device."
      icon={Bot}
    >
      <Card>
        <div className="space-y-3">
          {turns.length === 0 ? (
            <div className="text-text-2 text-sm">
              <p>Try one of these:</p>
              <ul className="mt-2 space-y-1.5">
                {['What is my net worth?', 'How much am I saving?', 'What should I fix first?'].map(
                  (example) => (
                    <li key={example}>
                      <button
                        type="button"
                        onClick={() => {
                          setText(example)
                        }}
                        className="rounded-tile text-gold hover:text-gold-strong underline underline-offset-2"
                      >
                        {example}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : (
            turns.map((turn, index) => (
              <p
                key={`${turn.role}-${String(index)}`}
                className={
                  turn.role === 'user'
                    ? 'rounded-tile bg-gold-dim text-text ml-auto max-w-[85%] px-3 py-2 text-sm'
                    : 'rounded-tile bg-surface-2 text-text-2 max-w-[85%] px-3 py-2 text-sm'
                }
              >
                {turn.body}
              </p>
            ))
          )}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <input
            id="assistant-input"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
            }}
            aria-label="Ask the assistant"
            placeholder="Ask about your money…"
            /* min-w-0: an input will not shrink below its default width otherwise,
               and on a 360px phone that pushed the Ask button off the card. */
            className="rounded-tile border-border bg-surface text-text placeholder:text-text-3 focus-visible:outline-text-2 h-11 min-w-0 flex-1 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <AppButton type="submit" className="shrink-0" disabled={text.trim().length === 0}>
            <Send aria-hidden className="size-4" />
            Ask
          </AppButton>
        </form>
      </Card>
    </ModuleScreen>
  )
}
