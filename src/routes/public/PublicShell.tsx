import { Menu, Sparkles, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Wordmark } from '@/components/ui/Wordmark'

/**
 * The logged-out chrome. §10 applies here too: one scroll owner, `100dvh`, and
 * the mobile menu is a panel in flow rather than a fixed overlay that traps the
 * page behind it.
 */
const NAV = [
  { to: '/features', label: 'Features' },
  { to: '/#stages', label: 'Stages' },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/request-centre', label: 'Request Centre' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
]

const LEGAL = [
  { to: '/legal/privacy', label: 'Privacy Policy' },
  { to: '/legal/terms', label: 'Terms & Conditions' },
  { to: '/legal/refund', label: 'Refund & Cancellation' },
  { to: '/legal/disclaimer', label: 'Disclaimer' },
  { to: '/legal/shipping', label: 'Shipment & Delivery' },
]

export function PublicShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-bg min-h-dvh">
      <header className="border-border bg-bg-elevated/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="rounded-tile text-text flex items-center gap-2 font-semibold">
            <Sparkles aria-hidden className="text-accent size-4" />
            <Wordmark className="text-body" />
          </Link>

          <nav aria-label="Main" className="ml-6 hidden flex-1 gap-5 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-tile text-text-2 hover:text-text text-sm transition-colors"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/auth"
              className="rounded-tile text-text-2 hover:text-text hidden px-2 text-sm sm:block"
            >
              Login
            </Link>
            <Link to="/auth?mode=signup">
              <AppButton size="sm">Get started</AppButton>
            </Link>
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
                  <Link
                    to={item.to}
                    onClick={() => {
                      setOpen(false)
                    }}
                    className="rounded-tile text-text-2 hover:text-text block py-3 text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6">{children}</main>

      <footer className="border-border bg-bg-elevated border-t">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-text flex items-center gap-2 font-semibold">
              <Sparkles aria-hidden className="text-accent size-4" />
              <Wordmark className="text-body" />
            </p>
            <p className="text-caption text-text-2 mt-2 max-w-xs">
              A step-by-step path from knowing where your money goes to making it outlast you.
            </p>
          </div>
          <div>
            <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {NAV.slice(0, 4).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="rounded-tile text-text-2 hover:text-text text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption text-text-label font-medium tracking-[0.1em] uppercase">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {LEGAL.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="rounded-tile text-text-2 hover:text-text text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
