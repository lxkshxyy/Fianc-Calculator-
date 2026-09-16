import { Database, Languages, Palette, Settings as SettingsIcon, ShieldAlert } from 'lucide-react'
import { useState } from 'react'

import { AppButton } from '@/components/ui/AppButton'
import { Card } from '@/components/ui/Card'
import { Sheet } from '@/components/ui/Sheet'
import { TierBadge } from '@/components/ui/TierBadge'
import { useData, useProfile } from '@/data/store/data'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import type { Language } from '@/data/schema/profile'
import { useSession } from '@/data/store/session'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const THEME_LABEL: Record<ThemePreference, TranslationKey> = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  system: 'settings.theme.system',
}

/**
 * The language names are NOT translated.
 *
 * Every picker of this kind writes each option in its own language, because the
 * person looking for Hindi is looking for the word "हिन्दी" — not for whatever
 * the current language calls Hindi. Translating these would hide the option
 * from the only people who need it.
 */
const LANGUAGE_LABEL: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
}

export function Settings() {
  const t = useT()
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  const clearEverything = useData((state) => state.clearEverything)
  const signOut = useSession((state) => state.signOut)
  const { preference, setPreference } = useTheme()
  const [confirmClear, setConfirmClear] = useState(false)

  if (profile === null) return null

  return (
    <ModuleScreen
      title={t('nav.settings')}
      subtitle={t('screen.settings.subtitle')}
      icon={SettingsIcon}
    >
      <ModuleSection label={t('settings.membership')}>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="text-text font-medium">{profile.displayName}</p>
              <p className="text-caption text-text-2">
                {profile.tier === 'diamond' ? t('settings.allStages') : t('settings.twoStages')}
              </p>
            </div>
            <TierBadge tier={profile.tier} />
            {/*
             * The tier switcher is how lock states get checked without a payment
             * provider — useful to whoever is building this, and nothing a
             * customer should ever be shown. `import.meta.env.DEV` is false in
             * `npm run build`, so Rollup drops this whole branch: it is present
             * under `npm run dev` and physically absent from the APK.
             */}
            {import.meta.env.DEV ? (
              <AppButton
                variant="ghost"
                onClick={() => {
                  void saveProfile({ tier: profile.tier === 'diamond' ? 'silver' : 'diamond' })
                }}
              >
                {profile.tier === 'diamond' ? 'Switch to Silver' : 'Switch to Diamond'}
              </AppButton>
            ) : null}
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label={t('settings.appearance')}>
        <Card>
          <div className="flex items-center gap-2.5">
            <Palette aria-hidden className="text-text-2 size-4" />
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
                      ? 'bg-gold text-on-gold rounded-full px-3 py-1.5 text-sm font-medium'
                      : 'border-border text-text-2 hover:border-border-strong rounded-full border px-3 py-1.5 text-sm'
                  }
                >
                  {t(THEME_LABEL[option])}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label={t('settings.language')}>
        <Card>
          <div className="flex items-center gap-2.5">
            <Languages aria-hidden className="text-text-2 size-4" />
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
                      ? 'bg-gold text-on-gold rounded-full px-3 py-1.5 text-sm font-medium'
                      : 'border-border text-text-2 hover:border-border-strong rounded-full border px-3 py-1.5 text-sm'
                  }
                >
                  {LANGUAGE_LABEL[language]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-caption text-text-3 mt-3">{t('settings.languageNote')}</p>
        </Card>
      </ModuleSection>

      <ModuleSection label={t('settings.yourData')}>
        <Card>
          <div className="flex items-start gap-3">
            <Database aria-hidden className="text-text-2 mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="text-text-2 text-sm">{t('settings.storedLocally')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {/*
                 * Not a build aid — this is the only way somebody can delete
                 * their own records from a device-only app, so it stays.
                 */}
                <AppButton
                  variant="ghost"
                  onClick={() => {
                    setConfirmClear(true)
                  }}
                >
                  {t('settings.deleteMyData')}
                </AppButton>
                <AppButton variant="ghost" onClick={signOut}>
                  {t('settings.signOut')}
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
        title={t('settings.confirmTitle')}
        description={t('settings.confirmDescription')}
        footer={
          <div className="flex gap-2">
            <AppButton
              variant="ghost"
              block
              onClick={() => {
                setConfirmClear(false)
              }}
            >
              {t('settings.keepMyData')}
            </AppButton>
            <AppButton
              block
              onClick={() => {
                void clearEverything()
                setConfirmClear(false)
              }}
            >
              {t('settings.deleteEverything')}
            </AppButton>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden className="text-warn mt-0.5 size-5 shrink-0" />
          <p className="text-text-2 text-sm">{t('settings.confirmBody')}</p>
        </div>
      </Sheet>
    </ModuleScreen>
  )
}
