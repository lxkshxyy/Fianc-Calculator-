import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  Target,
  User,
} from 'lucide-react'
import welcomeDark from '@/assets/welcome-dark.webp'
import welcomeLight from '@/assets/welcome-light.webp'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { AppButton } from '@/components/ui/AppButton'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/cn'
import { DEMO_NAME, isDemoAccount } from '@/data/seed/showcase'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import {
  MIN_PASSWORD_LENGTH,
  createPasscode,
  isPasswordSupported,
  verifyPasscode,
} from '@/lib/passcode'
import { isAppShell } from '@/native/platform'
import { WrcMark } from './AuthArt'
import { DemoEntry } from './DemoEntry'
import { PublicShell } from './PublicShell'

/**
 * §6 — one route, three screens, switched by `?mode=`.
 *
 *   /auth                 the welcome screen: the brand, and two ways in
 *   /auth?mode=login      email + password
 *   /auth?mode=signup     name + email + password
 *
 * The welcome screen is the first thing a new install shows and the thing a
 * sign-out returns to, which is why it is the bare route rather than a mode of
 * its own: nothing has to know a query string to land somewhere sensible.
 *
 * ── App and website ─────────────────────────────────────────────────────────
 * The welcome board and the phone-width forms are the Android app's. The same
 * route on the website opened them too — a 448px phone screen floating in a
 * laptop window, with no way back to the site around it. On the website the
 * bare route is the log-in form, and both forms sit inside the site's own
 * header and footer beside a brand panel (`WebAuthScreen`). `isAppShell` is the
 * switch; the forms themselves are shared, so the two cannot drift apart.
 *
 * ── On the password ─────────────────────────────────────────────────────────
 * It is real — hashed, salted, and checked — but it locks this device rather
 * than an account on a server, because there is no server (§13). That sentence
 * is on the sign-up screen too. See `lib/passcode.ts`.
 *
 * ── On what is deliberately absent ──────────────────────────────────────────
 * No "continue with Google / Apple / Facebook". Each is an SDK, a redirect, a
 * client id per platform and a privacy policy about what the provider is told —
 * all to hand an app with no server an identity it has nothing to do with. Name,
 * email, password, typed in. Nothing leaves the phone.
 *
 * Signing up starts the app **empty**. A first-run demo household would put
 * somebody else's ₹18 L of debt on your dashboard and leave you deleting rows
 * before you could add your own.
 */

const SignUpForm = z.object({
  displayName: z.string().trim().min(1, 'Your name is needed — it is what the app greets you by.'),
  email: z.string().trim().email('That does not look like an email address.'),
})

type Mode = 'welcome' | 'login' | 'signup'

function modeFrom(raw: string | null): Mode {
  return raw === 'signup' ? 'signup' : raw === 'login' ? 'login' : 'welcome'
}

export function Auth() {
  const [params] = useSearchParams()
  const mode = modeFrom(params.get('mode'))

  /*
   * `redirectTo` is attacker-controllable via the URL, so it is validated before
   * it is either navigated to or echoed back to the user.
   *
   * A single leading slash, rejecting `//host` and `/\host`: without this,
   * /auth?redirectTo=https://evil.com signs the user in and then throws
   * "External navigation is not allowed" inside the un-awaited navigate() — an
   * unhandled rejection (§12 wants zero console errors) that leaves them signed
   * in but stranded on /auth. The page also rendered the raw string back, which
   * put a legitimate-looking "You will be returned to https://evil.com" on our
   * own domain. RequireAuth only ever writes pathname + search, so nothing
   * legitimate is rejected.
   */
  const requested = params.get('redirectTo')
  const redirectTo = requested !== null && /^\/(?![/\\])/.test(requested) ? requested : null
  const destination = redirectTo ?? '/app/dashboard'

  /* Carried through every link, so a guarded URL survives the trip. */
  const suffix = redirectTo === null ? '' : `&redirectTo=${encodeURIComponent(redirectTo)}`

  if (mode === 'welcome' && isAppShell()) return <Welcome suffix={suffix} />
  if (mode === 'signup') return <SignUp destination={destination} suffix={suffix} />
  return <LogIn destination={destination} suffix={suffix} />
}

/* ------------------------------------------------------------------ *
 * Welcome
 * ------------------------------------------------------------------ */

function Welcome({ suffix }: { suffix: string }) {
  const account = useSession((state) => state.account)

  /*
   * ── The screen is the artwork ───────────────────────────────────────────────
   * The brand board is the design, so it is used as the design rather than
   * redrawn: one image per theme, at its own aspect ratio, edge to edge. What
   * the previous version drew in SVG — the mark, the headline, the hills — is
   * all painted into it.
   *
   * The two pills are painted in too, which is the part that needs care: a
   * picture of a button does nothing when it is pressed. So the real links sit
   * on top of the painted ones, positioned as percentages of the image's own
   * box. Because the box carries the image's exact aspect ratio, those
   * percentages hold at every width without measuring anything at runtime.
   *
   * The screen below the image is the colour the image ends on, so the artwork
   * simply runs out onto the page instead of stopping at an edge.
   *
   * ── What this costs ─────────────────────────────────────────────────────────
   * The words are pixels now, so they neither scale with the phone's font-size
   * setting nor translate to Hindi. The text is therefore also present as real
   * markup below, visually hidden: a screen reader, a translator and a search
   * engine all get the sentence, and the eye gets the picture.
   */
  return (
    <div className="splash mx-auto min-h-dvh w-full max-w-md">
      <div className="splash-board">
        <img src={welcomeLight} alt="" aria-hidden className="splash-art splash-art-light" />
        <img src={welcomeDark} alt="" aria-hidden className="splash-art splash-art-dark" />

        <h1 className="sr-only">{BRAND.full} — Build today, secure tomorrow.</h1>
        <p className="sr-only">Track, plan, grow. All your finances, in one place.</p>

        <SplashHit to={`/auth?mode=login${suffix}`} slot="login">
          {account === null ? 'Log in' : `Log in as ${account.displayName}`}
        </SplashHit>
        <SplashHit to={`/auth?mode=signup${suffix}`} slot="signup">
          Sign up
        </SplashHit>
      </div>
    </div>
  )
}

/**
 * A link laid over one of the painted pills.
 *
 * It carries no visible styling of its own — the image is the button — so the
 * two things it must not lose are a name and a focus ring. The label is the
 * accessible name; `.splash-hit` in index.css draws the ring on the pill's own
 * shape and flashes on press, so a tap is acknowledged even though nothing
 * underneath can react.
 *
 * The hit area is deliberately taller than the paint, filling the gap between
 * the two pills: at phone width the painted pill is about 34px tall, under the
 * §10.8 floor of 44, and a target nobody can hit reliably is the problem this
 * screen was brought back to fix.
 */
function SplashHit({
  to,
  slot,
  children,
}: {
  to: string
  slot: 'login' | 'signup'
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      aria-label={typeof children === 'string' ? children : undefined}
      className={cn('splash-hit', slot === 'login' ? 'splash-hit-login' : 'splash-hit-signup')}
    >
      <span className="sr-only">{children}</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ *
 * Log in
 * ------------------------------------------------------------------ */

function LogIn({ destination, suffix }: { destination: string; suffix: string }) {
  const navigate = useNavigate()
  const account = useSession((state) => state.account)
  const signIn = useSession((state) => state.signIn)
  const setPasscode = useSession((state) => state.setPasscode)

  const [email, setEmail] = useState(account?.email ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const supported = isPasswordSupported()
  /* No account yet on this device: there is nothing to sign in to, so say so
     and point at the one thing that does work. */
  if (account === null) {
    return (
      <AuthScreen title="Welcome Back!" subtitle="There is no account on this device yet.">
        <p className="text-text-2 text-meta">
          {BRAND.short} keeps your money on this device rather than on a server, so an account has
          to be made here before it can be signed into.
        </p>
        <AppButton
          variant="primary"
          block
          className="rounded-pill mt-5 min-h-13"
          onClick={() => {
            void navigate(`/auth?mode=signup${suffix}`, { replace: true })
          }}
        >
          Create an account
          <ArrowRight aria-hidden className="size-4" />
        </AppButton>
      </AuthScreen>
    )
  }

  /* The website's demo household (seed/showcase.ts). It has no password — there
     is nothing in it to protect — so the way back in is one button. */
  if (isDemoAccount(account)) {
    return (
      <AuthScreen
        title="Welcome Back!"
        subtitle="This browser has the demo account."
        suffix={suffix}
      >
        <p className="text-text-2 text-meta">
          {DEMO_NAME}’s sample household is saved here, with anything you changed while exploring.
        </p>
        <AppButton
          variant="primary"
          block
          className="rounded-pill mt-5 min-h-13 text-base font-semibold"
          onClick={() => {
            signIn({ remember: true })
            void navigate(destination, { replace: true })
          }}
        >
          Continue the demo
          <ArrowRight aria-hidden className="size-4" />
        </AppButton>
        <p className="text-caption text-text-2 mt-5 text-center">
          Want your own?{' '}
          <Link
            to={`/auth?mode=signup${suffix}`}
            className="text-accent hover:text-accent-strong font-semibold"
          >
            Create an account
          </Link>{' '}
          — it replaces the demo.
        </p>
      </AuthScreen>
    )
  }

  /* An account made before passwords existed, or on a connection that had no
     crypto to hash with. Rather than locking them out, the field becomes the
     one that sets the lock. */
  const needsPasscode = account.passcode === null && supported

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (account === null) return

    if (email.trim().toLowerCase() !== account.email.toLowerCase()) {
      setError('No account on this device uses that email.')
      return
    }

    setBusy(true)
    try {
      if (needsPasscode) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          setError(`Choose at least ${String(MIN_PASSWORD_LENGTH)} characters.`)
          return
        }
        setPasscode(await createPasscode(password))
      } else if (account.passcode !== null && supported) {
        if (!(await verifyPasscode(password, account.passcode))) {
          setError('That password does not match.')
          return
        }
      }

      signIn({ remember })
      void navigate(destination, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Welcome Back!"
      subtitle="Log in to continue your financial journey."
      suffix={suffix}
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <IconField
          icon={Mail}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          onChange={(value) => {
            setEmail(value)
            setError(null)
          }}
        />

        {!supported ? null : (
          <PasswordField
            label={needsPasscode ? 'Choose a password' : 'Password'}
            autoComplete={needsPasscode ? 'new-password' : 'current-password'}
            value={password}
            onChange={(value) => {
              setPassword(value)
              setError(null)
            }}
          />
        )}

        {needsPasscode ? (
          <p className="text-caption text-text-2">
            This account was made before {BRAND.short} had passwords. Choose one now and it will be
            asked for from next time.
          </p>
        ) : null}

        {!supported ? (
          <p className="text-caption text-warn">
            Passwords need a secure connection, and this one is not. Opening the installed app, or
            an https address, asks for it properly.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <CheckBox checked={remember} onChange={setRemember} label="Remember me" />
          <Link to="/forgot-password" className="text-caption text-accent hover:text-accent-strong">
            Forgot password?
          </Link>
        </div>

        {error === null ? null : (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}

        <AppButton
          type="submit"
          variant="primary"
          block
          disabled={busy}
          className="rounded-pill mt-2 min-h-13 text-base font-semibold"
        >
          {busy ? 'Checking…' : needsPasscode ? 'Set password and log in' : 'Log In'}
          <ArrowRight aria-hidden className="size-4" />
        </AppButton>
      </form>

      <p className="text-caption text-text-2 mt-5 text-center">
        Don’t have an account?{' '}
        <Link
          to={`/auth?mode=signup${suffix}`}
          className="text-accent hover:text-accent-strong font-semibold"
        >
          Sign Up
        </Link>
      </p>
    </AuthScreen>
  )
}

/* ------------------------------------------------------------------ *
 * Sign up
 * ------------------------------------------------------------------ */

function SignUp({ destination, suffix }: { destination: string; suffix: string }) {
  const navigate = useNavigate()
  const signUp = useSession((state) => state.signUp)
  const clearEverything = useData((state) => state.clearEverything)
  const saveProfile = useData((state) => state.saveProfile)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<{
    displayName?: string
    email?: string
    password?: string
    accepted?: string
  }>({})
  const [busy, setBusy] = useState(false)

  const supported = isPasswordSupported()

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const parsed = SignUpForm.safeParse({ displayName, email })
    const next: typeof errors = {}

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'displayName' || field === 'email') next[field] = issue.message
      }
    }
    if (supported && password.length < MIN_PASSWORD_LENGTH) {
      next.password =
        password === ''
          ? 'A password is needed.'
          : `At least ${String(MIN_PASSWORD_LENGTH)} characters.`
    }
    if (!accepted) next.accepted = 'Please accept the terms to continue.'

    if (Object.keys(next).length > 0 || !parsed.success) {
      setErrors(next)
      return
    }

    setErrors({})
    setBusy(true)

    const passcode = supported ? await createPasscode(password) : null

    /*
     * Order matters. Clear first, then write the profile — the other way round
     * and the clear wipes the profile that was just created.
     */
    await clearEverything()
    await saveProfile({ displayName: parsed.data.displayName, tier: 'silver' })
    signUp({ ...parsed.data, passcode })

    void navigate(destination, { replace: true })
  }

  return (
    <AuthScreen
      title="Create Your Account"
      subtitle={`Start building your financial future with ${BRAND.short}.`}
      suffix={suffix}
    >
      {/*
       * noValidate: the browser's own bubble would fire first and suppress the
       * validation below, and it cannot be styled, cannot be read by a screen
       * reader reliably, and says "Please fill in this field" where this says
       * what is actually wrong.
       */}
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <IconField
          icon={User}
          label="Full name"
          autoComplete="name"
          placeholder="Full Name"
          value={displayName}
          onChange={setDisplayName}
          error={errors.displayName}
        />
        <IconField
          icon={Mail}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        {!supported ? null : (
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
        )}

        <CheckBox
          checked={accepted}
          onChange={setAccepted}
          error={errors.accepted}
          label={
            <>
              I agree to the{' '}
              <Link to="/legal/terms" className="text-accent font-semibold">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link to="/legal/privacy" className="text-accent font-semibold">
                Privacy Policy
              </Link>
            </>
          }
        />

        <AppButton
          type="submit"
          variant="primary"
          block
          disabled={busy}
          className="rounded-pill mt-2 min-h-13 text-base font-semibold"
        >
          {busy ? 'Setting up…' : 'Sign Up'}
          <ArrowRight aria-hidden className="size-4" />
        </AppButton>
      </form>

      {/*
       * Said once, plainly, where somebody is about to trust the app with their
       * money. People assume an account means a server; here it does not, and
       * letting them assume otherwise is the dishonest option.
       */}
      <p className="text-caption text-text-3 mt-4">
        {supported
          ? `Your password locks ${BRAND.short} on this ${isAppShell() ? 'phone' : 'browser'}. Everything you enter stays on this device — there is no server holding it, and no account to recover it from.`
          : `${BRAND.short} keeps everything on this device. This connection cannot set a password; the installed app can.`}
      </p>

      <p className="text-caption text-text-2 mt-5 text-center">
        Already have an account?{' '}
        <Link
          to={`/auth?mode=login${suffix}`}
          className="text-accent hover:text-accent-strong font-semibold"
        >
          Log In
        </Link>
      </p>
    </AuthScreen>
  )
}

/* ------------------------------------------------------------------ *
 * Shared furniture
 * ------------------------------------------------------------------ */

function AuthScreen({
  title,
  subtitle,
  suffix = '',
  children,
}: {
  title: string
  subtitle: string
  suffix?: string
  children: ReactNode
}) {
  if (!isAppShell()) {
    return (
      <WebAuthScreen title={title} subtitle={subtitle}>
        {children}
      </WebAuthScreen>
    )
  }

  return (
    <div className="auth-sky relative min-h-dvh overflow-hidden">
      <AuthGlow />

      <div className="relative mx-auto w-full max-w-md px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Link
          to={suffix === '' ? '/auth' : `/auth?${suffix.slice(1)}`}
          aria-label="Back"
          className="text-text-2 hover:text-text rounded-tile -ml-2 inline-flex size-11 items-center justify-center transition-colors"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>

        <div className="mt-2 flex justify-center">
          <WrcMark size="md" />
        </div>

        <h1 className="text-text mt-8 text-[1.6rem] leading-tight font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-text-2 text-meta mt-1.5">{subtitle}</p>

        <div className="auth-card rounded-card mt-5 p-5">{children}</div>
      </div>
    </div>
  )
}

const WEB_POINTS: { icon: typeof Mail; title: string; line: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'Your whole picture',
    line: 'Income, spending, loans and investments on one dashboard.',
  },
  {
    icon: Target,
    title: 'A plan for every goal',
    line: 'The monthly figure that gets you there, and milestones on the way.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    line: 'Your figures stay on your device. Nothing is uploaded.',
  },
]

/**
 * The website's sign-in page: the site's header and footer, the form on the
 * right, and on a wide screen the brand beside it — the place a phone gives to
 * the welcome board. Below `lg` the panel steps aside and the form leads.
 */
function WebAuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const location = useLocation()
  const account = useSession((state) => state.account)
  const signingUp = new URLSearchParams(location.search).get('mode') === 'signup'
  /* The log-in form already leads with "Continue the demo" for the demo account. */
  const offerDemo = signingUp || !isDemoAccount(account)

  return (
    <PublicShell title={signingUp ? 'Sign up' : 'Log in'}>
      <section className="grid items-start gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14 lg:py-14">
        <aside className="auth-sky border-border rounded-card relative hidden overflow-hidden border p-10 lg:block">
          <AuthGlow />
          <div className="relative">
            <div className="flex justify-start">
              <WrcMark size="lg" />
            </div>
            <p className="text-text font-display mt-10 text-[2.5rem] leading-[1.08] font-semibold tracking-tight text-balance">
              Build today,
              <br />
              <span className="text-accent">secure tomorrow.</span>
            </p>
            <p className="text-lead text-text-2 mt-4">
              Track · Plan · Grow — all your finances, in one place.
            </p>
            <ul className="mt-10 space-y-5">
              {WEB_POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-3.5">
                  <span className="rounded-tile bg-surface-2 border-border shrink-0 border p-2">
                    <point.icon aria-hidden className="text-accent size-5" />
                  </span>
                  <span>
                    <span className="text-text block font-semibold">{point.title}</span>
                    <span className="text-text-2 block text-sm">{point.line}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[440px] lg:max-w-none">
          <h1 className="text-text text-[1.75rem] leading-tight font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-text-2 text-meta mt-1.5">{subtitle}</p>

          <div className="auth-card rounded-card mt-5 p-5 sm:p-6">{children}</div>

          {offerDemo ? (
            <div className="border-border bg-surface rounded-card mt-4 border p-4">
              <p className="text-text text-sm font-medium">Just looking around?</p>
              <p className="text-caption text-text-2 mt-1">
                Open a sample household with every screen filled in. No sign-up needed.
              </p>
              <DemoEntry block size="sm" className="mt-3" />
            </div>
          ) : null}
        </div>
      </section>
    </PublicShell>
  )
}

/** The two soft colour washes behind everything. Decoration, nothing more. */
function AuthGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="auth-blob absolute -top-24 -right-20 size-72 rounded-full" />
      <span className="auth-blob-2 absolute -bottom-10 -left-24 size-80 rounded-full" />
    </div>
  )
}

type IconType = typeof Mail

/**
 * A field with its icon inside the box, as the design has it.
 *
 * The visible placeholder is the label in the mockup, which would leave the
 * field with no accessible name once somebody starts typing — and no name at
 * all for anyone using a screen reader. So the real label is here and visually
 * hidden: the design keeps its clean box, the field keeps its name.
 */
function IconField({
  icon: Icon,
  label,
  value,
  onChange,
  error,
  trailing,
  ...input
}: {
  icon: IconType
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  trailing?: ReactNode
  type?: string
  inputMode?: 'email' | 'text'
  autoComplete?: string
  placeholder?: string
}) {
  const id = useId()
  const invalid = error !== undefined && error !== ''

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          'rounded-button flex items-center gap-2.5 border px-3.5 transition-colors',
          'auth-input',
          invalid ? 'border-danger' : 'border-border hover:border-border-strong',
        )}
      >
        <Icon aria-hidden className="text-text-3 size-4.5 shrink-0" />
        <input
          id={id}
          value={value}
          aria-invalid={invalid}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className="text-body text-text placeholder:text-text-3 min-h-12 w-full bg-transparent outline-none"
          {...input}
        />
        {trailing}
      </div>
      {invalid ? <p className="text-caption text-danger mt-1">{error}</p> : null}
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete: string
}) {
  const [shown, setShown] = useState(false)
  const Toggle = shown ? EyeOff : Eye

  return (
    <IconField
      icon={Lock}
      label={label}
      placeholder={label}
      type={shown ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      error={error}
      trailing={
        <button
          type="button"
          /* The state it will be in after the press, which is what a label is for. */
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => {
            setShown((current) => !current)
          }}
          className="text-text-3 hover:text-text-2 -mr-1.5 flex size-10 shrink-0 items-center justify-center transition-colors"
        >
          <Toggle aria-hidden className="size-4.5" />
        </button>
      }
    />
  )
}

function CheckBox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  error?: string
}) {
  const id = useId()

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            onChange(event.target.checked)
          }}
          className="accent-accent mt-0.5 size-4.5 shrink-0"
        />
        <label htmlFor={id} className="text-caption text-text-2 leading-snug">
          {label}
        </label>
      </div>
      {error === undefined || error === '' ? null : (
        <p className="text-caption text-danger mt-1">{error}</p>
      )}
    </div>
  )
}
