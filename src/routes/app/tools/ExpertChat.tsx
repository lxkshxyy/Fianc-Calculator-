import { CalendarClock, MessagesSquare } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { RecordList } from '@/components/ui/RecordList'
import { useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

export function ExpertChat() {
  const snapshot = useSnapshot()
  if (snapshot === null) return null

  const threads = snapshot.chatThreads.filter((thread) => thread.channel === 'expert')

  return (
    <ModuleScreen
      title="Expert Chat"
      subtitle="Talk to a certified advisor about your own numbers."
      icon={MessagesSquare}
      moduleId="insurance"
      unlockLine="live advisor chat"
    >
      <ModuleSection label="Book a call">
        <Card>
          <div className="flex items-start gap-3">
            <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
            <div>
              <h2 className="font-semibold text-text">A free 15-minute call</h2>
              <p className="mt-1.5 max-w-prose text-sm text-text-2">
                Booking connects to the advisory team's calendar, which is not wired up in this
                build. Use the Request Centre in the meantime — it reaches the same team.
              </p>
            </div>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label="Your conversations">
        <RecordList
          rows={threads.map((thread) => ({
            id: thread.id,
            icon: MessagesSquare,
            title: thread.title,
          }))}
          empty={{
            icon: MessagesSquare,
            title: 'No conversations yet',
            description: 'Start one by raising a request, and the thread appears here.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
