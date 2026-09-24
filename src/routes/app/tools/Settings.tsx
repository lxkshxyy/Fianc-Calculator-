import {
  ChevronRight,
  Database,
  Gem,
  KeyRound,
  Palette,
  Settings as SettingsIcon,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { APP_BASE } from '@/app/nav/navigation'
import { AppButton } from '@/components/ui/AppButton'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Sheet } from '@/components/ui/Sheet'
import { TierBadge } from '@/components/ui/TierBadge'
import { hasServer } from '@/config/server'
import { useData, useProfile, useSnapshot } from '@/data/store/data'
import { useT } from '@/i18n'
import type { TranslationKey } from '@/i18n/en'
import { useSession } from '@/data/store/session'
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/lib/theme'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

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
  const snapshot = useSnapshot()
  const navigate = useNavigate()
  const { preference, setPreference } = useTheme()
  const [confirmClear, setConfirmClear] = useState(false)

  if (profile === null) return null

  const upgradePending =
    snapshot?.requests.some(
      (request) => request.service === 'diamond-upgrade' && request.status !== 'closed',
    ) ?? false

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

      <ModuleSection label={t('settings.membership')}>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="text-text font-medium">
                {profile.tier === 'diamond' ? 'Diamond' : 'Silver'}
              </p>
              <p className="text-caption text-text-2">
                {profile.tier === 'diamond'
                  ? t('settings.allStages')
                  : upgradePending
                    ? t('settings.upgradePendingLine')
                    : t('settings.twoStages')}
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
          {profile.tier === 'diamond' ? null : (
            <AppButton
              variant="primary"
              block
              className="mt-4"
              onClick={() => {
                void navigate(`${APP_BASE}/upgrade`)
              }}
            >
              {upgradePending ? (
                <KeyRound aria-hidden className="size-4" />
              ) : (
                <Gem aria-hidden className="size-4" />
              )}
              {upgradePending ? t('settings.upgradePending') : t('settings.upgrade')}
            </AppButton>
          )}
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

      <ModuleSection label={t('settings.yourData')}>
        <Card>
          <div className="flex items-start gap-3">
            <Database aria-hidden className="text-text-2 mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="text-text-2 text-sm">
                {t(hasServer() ? 'settings.storedWithServer' : 'settings.storedLocally')}
              </p>
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
