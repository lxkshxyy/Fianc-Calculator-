import { CalendarHeart, Flame } from 'lucide-react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { MetricTile } from '@/components/ui/MetricTile'
import { RecordList } from '@/components/ui/RecordList'
import { todayIso } from '@/data/schema'
import { useData, useSnapshot } from '@/data/store/data'
import { currentStreak } from '@/domain/streak'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const AFFIRMATIONS = [
  'Small, boring and repeated beats clever and occasional.',
  'You cannot fix what you have not measured.',
  'Every rupee you keep is a rupee you never have to earn twice.',
  'Progress is a streak, not a sprint.',
]

export function MorningClub() {
  const snapshot = useSnapshot()
  const create = useData((state) => state.create)
  const saveProfile = useData((state) => state.saveProfile)
  if (snapshot === null) return null

  const today = todayIso()
  const dates = snapshot.checkIns.map((entry) => entry.date)
  const streak = currentStreak(dates, today)
  const checkedInToday = dates.includes(today)
  const affirmation = AFFIRMATIONS[streak % AFFIRMATIONS.length] ?? AFFIRMATIONS[0]

  async function checkIn(): Promise<void> {
    if (checkedInToday) return
    await create('checkIns', { date: today, note: '' })
    await saveProfile({
      streakCount: currentStreak([...dates, today], today),
      lastCheckInDate: today,
    })
  }

  return (
    <ModuleScreen
      title="Morning Club"
      subtitle="One check-in a day. That is the whole thing."
      icon={CalendarHeart}
      summary={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricTile
            label="Current streak"
            icon={Flame}
            value={
              <span className="text-title tabular-nums">
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            }
          />
          <MetricTile
            label="Total check-ins"
            icon={CalendarHeart}
            value={<span className="text-title tabular-nums">{snapshot.checkIns.length}</span>}
          />
        </div>
      }
    >
      <ModuleSection label="Today">
        <Card>
          <p className="text-lead text-text text-balance">{affirmation}</p>
          <div className="mt-4">
            <AppButton
              onClick={() => {
                void checkIn()
              }}
              disabled={checkedInToday}
            >
              {checkedInToday ? 'Checked in today' : 'Check in'}
            </AppButton>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label="Recent">
        <RecordList
          rows={[...snapshot.checkIns]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 10)
            .map((entry) => ({
              id: entry.id,
              icon: CalendarHeart,
              title: entry.date,
              subtitle: entry.date === today ? 'Today' : undefined,
            }))}
          empty={{
            icon: CalendarHeart,
            title: 'No check-ins yet',
            description: 'Check in once and the streak starts.',
          }}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}
