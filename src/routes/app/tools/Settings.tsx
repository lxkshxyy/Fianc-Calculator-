import {
  ChevronRight,
  Database,
  Languages,
  LogOut,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_BASE } from '@/app/nav/navigation'
import { AppButton } from '@/components/ui/AppButton'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Sheet } from '@/components/ui/Sheet'
import { hasServer } from '@/config/server'
import type { Language } from '@/data/schema/profile'
import { useData, useProfile } from '@/data/store/data'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import { useSession } from '@/data/store/session'
import { cn } from '@/lib/cn'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

/**
 * Written in each language's own script, never translated: the person looking
 * for Hindi is scanning for "हिन्दी", and the current language's word for it
 * would hide the option from exactly them. Adding a language is a dictionary in
 * src/i18n plus one line here.
 */
const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
]

/*
 * Both choices on this screen are segmented controls: one rounded track, the
 * picked option filled. Segments size to their words (flex-auto), so "Match my
 * device" — or फ़ोन के हिसाब से — takes the room it needs and the three theme
 * options stay on one row on a 360px phone, which separate pills did not.
 */
const TRACK = 'bg-surface-2 flex min-w-0 flex-1 gap-1 rounded-full p-1'

function segmentClass(selected: boolean): string {
  return cn(
    'min-h-11 flex-auto rounded-full px-3 text-sm whitespace-nowrap transition-colors duration-150',
    selected ? 'bg-gold text-on-gold font-medium shadow-sm' : 'text-text-2 hover:text-text',
  )
}

const THEME_LABEL: Record<ThemePreference, TranslationKey> = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  system: 'settings.theme.system',
}

export function Settings() {
  const t = useT()
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  const clearEverything = useData((state) => state.clearEverything)
  const signOut = useSession((state) => state.signOut)
  const email = useSession((state) => state.account?.email ?? '')
  const { preference, setPreference } = useTheme()
  const [confirmClear, setConfirmClear] = useState(false)

  if (profile === null) return null

  return (
    <ModuleScreen
      title={t('nav.settings')}
      subtitle={t('screen.settings.subtitle')}
      icon={SettingsIcon}
    >
      <ModuleSection label={t('settings.profile')}>
        <Link
          to={`${APP_BASE}/profile`}
          className="rounded-card border-border bg-surface p-card hover:bg-surface-2 focus-visible:outline-text-2 flex items-center gap-3 border transition-colors focus-visible:outline-2"
        >
          <Avatar avatar={profile.avatar} name={profile.displayName} size={48} />
          <span className="min-w-0 flex-1">
            <span className="text-text block truncate font-medium">{profile.displayName}</span>
            <span className="text-caption text-text-2 block truncate">
              {email === '' ? t('settings.profileLine') : email}
            </span>
          </span>
          <ChevronRight aria-hidden className="text-text-3 size-4 shrink-0" />
        </Link>
      </ModuleSection>

      {/*
       * Language sits here, with the other ways of setting the app up. Membership
       * moved the other way, to Profile — it is about the person, not the app.
       */}
      <ModuleSection label={t('settings.language')}>
        <Card>
          <div className="flex items-center gap-2.5">
            {/* The 文A mark is how someone who cannot read the label finds this. */}
            <Languages aria-hidden className="text-text-2 size-4 shrink-0" />
            <div role="group" aria-label={t('settings.language')} className={TRACK}>
              {LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => {
                    void saveProfile({ language: language.id })
                  }}
                  aria-pressed={profile.language === language.id}
                  className={segmentClass(profile.language === language.id)}
                >
                  {language.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-caption text-text-3 mt-3">{t('settings.languageNote')}</p>
        </Card>
      </ModuleSection>

      <ModuleSection label={t('settings.appearance')}>
        <Card>
          <div role="group" aria-label={t('settings.appearance')} className={TRACK}>
            {THEME_PREFERENCES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPreference(option)
                }}
                aria-pressed={preference === option}
                className={segmentClass(preference === option)}
              >
                {t(THEME_LABEL[option])}
              </button>
            ))}
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection label={t('settings.yourData')}>
        <Card>
          <div className="flex items-start gap-3">
            <Database aria-hidden className="text-text-2 mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-text-2 text-sm">
                {t(hasServer() ? 'settings.storedWithServer' : 'settings.storedLocally')}
              </p>
              {/*
               * Outlined rather than ghost: as ghost buttons these read as two
               * loose lines of text, indented by their own padding.
               */}
              <div className="mt-4 flex flex-wrap gap-2">
                {/*
                 * Not a build aid — this is the only way somebody can delete
                 * their own records from a device-only app, so it stays.
                 */}
                <AppButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setConfirmClear(true)
                  }}
                >
                  <Trash2 aria-hidden className="size-4" />
                  {t('settings.deleteMyData')}
                </AppButton>
                <AppButton variant="outline" size="sm" onClick={signOut}>
                  <LogOut aria-hidden className="size-4" />
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
