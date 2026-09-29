import { Menu, Sparkles, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Wordmark } from '@/components/ui/Wordmark'
import { BRAND } from '@/config/brand'
import { useSession } from '@/data/store/session'
import { cn } from '@/lib/cn'

/**
 * The logged-out chrome. §10 applies here too: one scroll owner, `100dvh`, and
 * the mobile menu is a panel in flow rather than a fixed overlay that traps the
 * page behind it.
 *
 * Every item in the menu is a page of its own. Stages, Pricing and FAQ used to
 * be `/#section` links into the landing page, which broke in three ways at
 * once: a client-side link does not scroll to a hash, so the page stayed
 * wherever it was; all three matched `/`, so on the home page all three were
 * highlighted together; and from any other page they simply led home.
 */
const NAV = [
  { to: '/features', label: 'Features' },
  { to: '/stages', label: 'Stages' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/request-centre', label: 'Request Centre' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
]

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/stages', label: 'The six stages' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/request-centre', label: 'Request Centre' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/legal/privacy', label: 'Privacy Policy' },
      { to: '/legal/terms', label: 'Terms & Conditions' },
      { to: '/legal/refund', label: 'Refund & Cancellation' },
      { to: '/legal/disclaimer', label: 'Disclaimer' },
      { to: '/legal/shipping', label: 'Shipment & Delivery' },
    ],
  },
]

/**
 * A new page starts at its top, and an address with a section in it opens at
 * that section.
 *
 * The browser does neither for a client-side navigation: it keeps the old
 * scroll position, so following a link from halfway down the home page opened
 * the next page halfway down too — which read as "the link did nothing".
 */
function useScrollOnNavigate(): void {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash !== '') {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target !== null) {
        target.scrollIntoView({ block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search, hash])
}

/** "Stages · Wealth Rebuild Circle" in the tab; the plain name on the home page. */
function usePageTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title === undefined ? BRAND.full : `${title} · ${BRAND.full}`
    return () => {
      document.title = BRAND.full
    }
  }, [title])
}

export function PublicShell({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  /* One route serves both forms, so the path alone cannot say which is open. */
  const onLogin =
    location.pathname === '/auth' && new URLSearchParams(location.search).get('mode') !== 'signup'
  /*
   * Someone already signed in reaches these pages too — the app's own menu opens
   * the Request Centre here. "Login" and "Get started" mean nothing to them, and
   * in the Android app, where this page has no bottom bar, they would be the
   * only way on; the way back to their dashboard is what they need.
   */
  const signedIn = useSession((state) => state.signedIn)

  useScrollOnNavigate()
  usePageTitle(title)

  return (
    <div className="bg-bg min-h-dvh">
      <header className="border-border bg-bg-elevated sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="rounded-tile text-text flex items-center gap-2 font-semibold">
            <Sparkles aria-hidden className="text-accent size-4" />
            {/*
             * WRC on a phone, the full name from sm up: beside the theme toggle,
             * "Get started" and the menu, the full name wrapped onto two lines
             * and squeezed "Get started" onto two more.
             */}
            <Wordmark short className="text-body sm:hidden" />
            <Wordmark className="text-body hidden sm:inline" />
          </Link>

          <nav aria-label="Main" className="ml-6 hidden h-full flex-1 items-stretch gap-5 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-tile relative flex items-center text-sm whitespace-nowrap transition-colors',
                    isActive ? 'text-text font-medium' : 'text-text-2 hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {/* The page you are on, marked on the header's own edge. */}
                    {isActive ? (
                      <span
                        aria-hidden
                        className="bg-accent absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Link
                to="/app/dashboard"
                className={buttonClass({ size: 'sm' }, 'whitespace-nowrap')}
              >
                My dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?mode=login"
                  aria-current={onLogin ? 'page' : undefined}
                  className={cn(
                    'rounded-tile hidden px-2 text-sm sm:block',
                    onLogin ? 'text-text font-medium' : 'text-text-2 hover:text-text',
                  )}
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className={buttonClass({ size: 'sm' }, 'whitespace-nowrap')}
                >
                  Get started
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen((value) => !value)
              }}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="rounded-tile text-text-2 hover:text-text p-2 lg:hidden"
            >
              {open ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </div>

        {open ? (
          <nav aria-label="Main, mobile" className="border-border border-t lg:hidden">
            <ul className="mx-auto max-w-[1200px] px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => {
                      setOpen(false)
                    }}
                    className={({ isActive }) =>
                      cn(
                        'rounded-tile block py-3 text-sm',
                        isActive ? 'text-accent font-medium' : 'text-text-2 hover:text-text',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              {/* "Login" sits beside the logo from sm up; below that it lives here. */}
              <li className="sm:hidden">
                <Link
                  to="/auth?mode=login"
                  aria-current={onLogin ? 'page' : undefined}
                  onClick={() => {
                    setOpen(false)
                  }}
                  className={cn(
                    'rounded-tile block py-3 text-sm',
                    onLogin ? 'text-accent font-medium' : 'text-text-2 hover:text-text',
                  )}
                >
                  Log in
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6">{children}</main>

      <footer className="border-border bg-bg-elevated border-t">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <p className="text-text flex items-center gap-2 font-semibold">
              <Sparkles aria-hidden className="text-accent size-4" />
              <Wordmark className="text-body" />
            </p>
            <p className="text-caption text-text-2 mt-2 max-w-xs">
              A step-by-step path from knowing where your money goes to making it outlast you.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
                {column.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="rounded-tile text-text-2 hover:text-text text-sm">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border border-t">
          <p className="text-caption text-text-3 mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6">
            Educational information only, not financial advice. Nothing here is a recommendation to
            buy or sell any product.
          </p>
        </div>
      </footer>
    </div>
  )
}
