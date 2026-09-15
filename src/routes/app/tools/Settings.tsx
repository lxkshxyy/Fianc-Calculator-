import { Database, Languages, Palette, Settings as SettingsIcon, ShieldAlert } from 'lucide-react'
import { useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { Sheet } from '@/components/ui/Sheet'
import { TierBadge } from '@/components/ui/TierBadge'
import { useData, useProfile } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const THEME_LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Match my device',
}

export function Settings() {
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  const resetToDemo = useData((state) => state.resetToDemo)
  const clearEverything = useData((state) => state.clearEverything)
  const signOut = useSession((state) => state.signOut)
  const { preference, setPreference } = useTheme()
  const [confirmClear, setConfirmClear] = useState(false)

  if (profile === null) return null

  return (
    <ModuleScreen
      title="Settings"
      subtitle="Your profile, how the app looks, and what happens to your data."
      icon={SettingsIcon}
    >
      <ModuleSection label="Membership">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-text">{profile.displayName}</p>
              <p className="text-caption text-text-2">
                {profile.tier === 'diamond' ? 'All six stages open' : 'Stages one and two open'}
              </p>
            </div>
            <TierBadge tier={profile.tier} />
            <AppButton
              variant="ghost"
              onClick={() => {
                void saveProfile({ tier: profile.tier === 'diamond' ? 'silver' : 'diamond' })
              }}
            >
              {profile.tier === 'diamond' ? 'Switch to Silver' : 'Switch to Diamond'}
            </AppButton>
          </div>
          <p className="mt-3 text-caption text-text-3">
            Switching tiers here is a build aid — it is how you check the §9.5 lock states without a
            payment provider.
          </p>
        </Card>
      </ModuleSection>

      <ModuleSection label="Appearance">
        <Card>
          <div className="flex items-center gap-2.5">
            <Palette aria-hidden className="size-4 text-text-2" />
            <div className="flex flex-wrap gap-2">
              {THEME_PREFERENCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setPreference(option)
                  }}
                  aria-pressed={preference === option}
                  className={
                    preference === option
                      ? 'rounded-full bg-gold px-3 py-1.5 font-medium text-on-gold text-sm'
                      : 'rounded-full border border-border px-3 py-1.5 text-sm text-text-2 hover:border-border-strong'
                  }
                >
                  {THEME_LABEL[option]}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label="Language">
        <Card>
          <div className="flex items-center gap-2.5">
            <Languages aria-hidden className="size-4 text-text-2" />
            <div className="flex gap-2">
              {(['en', 'hi'] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => {
                    void saveProfile({ language })
                  }}
                  aria-pressed={profile.language === language}
                  className={
                    profile.language === language
                      ? 'rounded-full bg-gold px-3 py-1.5 font-medium text-on-gold text-sm'
                      : 'rounded-full border border-border px-3 py-1.5 text-sm text-text-2 hover:border-border-strong'
                  }
                >
                  {language === 'en' ? 'English' : 'हिन्दी'}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-caption text-text-3">
            The preference is saved. Translated copy is not in this build.
          </p>
        </Card>
      </ModuleSection>

      <ModuleSection label="Your data">
        <Card>
          <div className="flex items-start gap-3">
            <Database aria-hidden className="mt-0.5 size-4 shrink-0 text-text-2" />
            <div className="flex-1">
              <p className="text-sm text-text-2">
                Everything is stored on this device only. Nothing is sent anywhere.
              </p>
              <p className="mt-1.5 text-caption text-text-3">
                The figures you are looking at are demo data until you replace them.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AppButton
                  variant="ghost"
                  onClick={() => {
                    void resetToDemo()
                  }}
                >
                  Reset to demo data
                </AppButton>
                <AppButton
                  variant="ghost"
                  onClick={() => {
                    setConfirmClear(true)
                  }}
                >
                  Clear everything
                </AppButton>
                <AppButton variant="ghost" onClick={signOut}>
                  Sign out
                </AppButton>
              </div>
            </div>
          </div>
        </Card>
      </ModuleSection>

      <Sheet
        open={confirmClear}
        onClose={() => {
          setConfirmClear(false)
        }}
        title="Clear everything?"
        description="Every record on this device is deleted. This cannot be undone."
        footer={
          <div className="flex gap-2">
            <AppButton
              variant="ghost"
              block
              onClick={() => {
                setConfirmClear(false)
              }}
            >
              Keep my data
            </AppButton>
            <AppButton
              block
              onClick={() => {
                void clearEverything()
                setConfirmClear(false)
              }}
            >
              Clear everything
            </AppButton>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
          <p className="text-sm text-text-2">
            Your income, spending, loans, holdings, goals and policies are all removed. The app keeps
            working — every screen falls back to its empty state.
          </p>
        </div>
      </Sheet>
    </ModuleScreen>
  )
}
