import { Camera, Check, Gem, ImagePlus, KeyRound, Trash2, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { APP_BASE } from '@/app/nav/navigation'
import { AppButton } from '@/components/ui/AppButton'
import { Avatar, PresetArt } from '@/components/ui/Avatar'
import { AVATAR_PRESETS, presetRef } from '@/components/ui/avatarPresets'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { TierBadge } from '@/components/ui/TierBadge'
import { useData, useProfile, useSnapshot } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { useT } from '@/i18n'
import { photoToAvatar } from '@/lib/avatar'
import { cn } from '@/lib/cn'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

function mobileOk(input: string): boolean {
  const digits = input.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '')
  return input.trim() === '' || /^[6-9]\d{9}$/.test(digits)
}

/**
 * The person's own corner: what they are called, what they look like in the
 * app, and which plan they are on — with the way to Diamond right under it.
 * (Language lives in Settings, with the other ways of setting the app up.)
 *
 * A picture is saved the moment it is picked — choosing an avatar is not a form
 * anyone expects to submit — while the name and contact details wait for Save,
 * because half-typed text should not overwrite the greeting on every keypress.
 */
export function Profile() {
  const t = useT()
  const profile = useProfile()
  const saveProfile = useData((state) => state.saveProfile)
  const account = useSession((state) => state.account)
  const updateAccount = useSession((state) => state.updateAccount)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; phone: string; email: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const snapshot = useSnapshot()
  const navigate = useNavigate()

  if (profile === null) return null

  const upgradePending =
    snapshot?.requests.some(
      (request) => request.service === 'diamond-upgrade' && request.status !== 'closed',
    ) ?? false

  /* The form shows the stored values until the person starts typing. */
  const values = draft ?? {
    name: profile.displayName === 'You' ? '' : profile.displayName,
    phone: profile.phone,
    email: account?.email ?? '',
  }
  const hasPhoto = profile.avatar?.startsWith('data:image/') === true

  function edit(next: Partial<typeof values>): void {
    setDraft({ ...values, ...next })
    setSaved(false)
  }

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    setPhotoError(null)
    try {
      await saveProfile({ avatar: await photoToAvatar(file) })
    } catch {
      setPhotoError(t('profile.photoError'))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const next: Record<string, string> = {}
    const name = values.name.trim().replace(/\s+/g, ' ')
    const email = values.email.trim()
    if (name === '') next['name'] = t('profile.nameNeeded')
    if (!mobileOk(values.phone)) next['phone'] = t('profile.mobileInvalid')
    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next['email'] = t('profile.emailInvalid')
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    await saveProfile({ displayName: name.slice(0, 60), phone: values.phone.trim() })
    updateAccount({
      displayName: name.slice(0, 60),
      ...(email === '' ? {} : { email }),
    })
    setDraft(null)
    setSaved(true)
  }

  return (
    <ModuleScreen title={t('nav.profile')} subtitle={t('profile.subtitle')} icon={UserRound}>
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar avatar={profile.avatar} name={values.name || profile.displayName} size={84} />
            <button
              type="button"
              onClick={() => {
                galleryInput.current?.click()
              }}
              aria-label={t('profile.changePhoto')}
              className="bg-gold text-on-gold border-bg-elevated absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-2"
            >
              <Camera aria-hidden className="size-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-title text-text font-semibold break-words">{profile.displayName}</p>
            {account?.email === undefined ? null : (
              <p className="text-meta text-text-2 truncate">{account.email}</p>
            )}
            <TierBadge tier={profile.tier} size="sm" className="mt-2" />
          </div>
        </div>
      </Card>

      <ModuleSection label={t('settings.membership')}>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
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

      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => void onPhoto(event)}
      />

      <ModuleSection label={t('profile.picture')}>
        <Card>
          <p className="text-meta text-text-2">{t('profile.pictureHint')}</p>
          <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {AVATAR_PRESETS.map((preset, index) => {
              const selected = profile.avatar === presetRef(preset.id)
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={t('profile.avatarN', { n: index + 1 })}
                    onClick={() => {
                      void saveProfile({ avatar: presetRef(preset.id) })
                    }}
                    className={cn(
                      'relative block aspect-square w-full overflow-hidden rounded-full transition-shadow',
                      selected
                        ? 'ring-gold ring-offset-surface ring-[3px] ring-offset-2'
                        : 'ring-border hover:ring-border-strong ring-1',
                    )}
                  >
                    <PresetArt id={preset.id} className="block size-full" />
                    {selected ? <SelectedTick /> : null}
                  </button>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                aria-pressed={hasPhoto}
                aria-label={hasPhoto ? t('profile.yourPhoto') : t('profile.fromGallery')}
                onClick={() => {
                  galleryInput.current?.click()
                }}
                className={cn(
                  'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full',
                  hasPhoto
                    ? 'ring-gold ring-offset-surface ring-[3px] ring-offset-2'
                    : 'bg-surface-2 text-text-2 hover:text-text border-border-strong border border-dashed',
                )}
              >
                {hasPhoto && profile.avatar !== null ? (
                  <>
                    <img src={profile.avatar} alt="" className="size-full object-cover" />
                    <SelectedTick />
                  </>
                ) : (
                  <ImagePlus aria-hidden className="size-6" />
                )}
              </button>
            </li>
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AppButton
              size="sm"
              onClick={() => {
                galleryInput.current?.click()
              }}
            >
              <ImagePlus aria-hidden className="size-4" />
              {t('profile.fromGallery')}
            </AppButton>
            {profile.avatar === null ? null : (
              <AppButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  void saveProfile({ avatar: null })
                }}
              >
                <Trash2 aria-hidden className="size-4" />
                {t('profile.removePicture')}
              </AppButton>
            )}
          </div>
          {photoError === null ? null : (
            <p role="alert" className="text-caption text-danger mt-2">
              {photoError}
            </p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection label={t('profile.details')}>
        <Card>
          <form noValidate onSubmit={(event) => void submit(event)}>
            <TextField
              label={t('profile.name')}
              autoComplete="name"
              value={values.name}
              hint={t('profile.nameHint')}
              error={errors['name']}
              onChange={(event) => {
                edit({ name: event.target.value })
              }}
            />
            <TextField
              label={t('profile.mobile')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={values.phone}
              error={errors['phone']}
              onChange={(event) => {
                edit({ phone: event.target.value })
              }}
            />
            <TextField
              label={t('profile.email')}
              type="email"
              autoComplete="email"
              value={values.email}
              error={errors['email']}
              onChange={(event) => {
                edit({ email: event.target.value })
              }}
            />
            <div className="flex items-center gap-3">
              <AppButton type="submit" variant="primary" disabled={draft === null}>
                {t('profile.save')}
              </AppButton>
              {saved ? (
                <span role="status" className="text-meta text-success flex items-center gap-1.5">
                  <Check aria-hidden className="size-4" />
                  {t('profile.saved')}
                </span>
              ) : null}
            </div>
          </form>
        </Card>
      </ModuleSection>
    </ModuleScreen>
  )
}

function SelectedTick() {
  return (
    <span className="bg-gold text-on-gold absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full">
      <Check aria-hidden strokeWidth={3} className="size-3" />
    </span>
  )
}
