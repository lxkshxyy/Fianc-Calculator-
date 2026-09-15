import { Menu, Sparkles, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

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
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-border border-b bg-bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 rounded-tile font-semibold text-text">
            <Sparkles aria-hidden className="size-4 text-gold" />
            ProsperityPath
          </Link>

          <nav aria-label="Main" className="ml-6 hidden flex-1 gap-5 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-tile text-sm text-text-2 transition-colors hover:text-text"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth" className="hidden rounded-tile px-2 text-sm text-text-2 hover:text-text sm:block">
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
              className="rounded-tile p-2 text-text-2 hover:text-text lg:hidden"
            >
              {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
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
                    className="block rounded-tile py-3 text-sm text-text-2 hover:text-text"
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

      <footer className="border-border border-t bg-bg-elevated">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="flex items-center gap-2 font-semibold text-text">
              <Sparkles aria-hidden className="size-4 text-gold" />
              ProsperityPath
            </p>
            <p className="mt-2 max-w-xs text-caption text-text-2">
              A step-by-step path from knowing where your money goes to making it outlast you.
            </p>
          </div>
          <div>
            <p className="font-medium text-caption text-text-label uppercase tracking-[0.1em]">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {NAV.slice(0, 4).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="rounded-tile text-sm text-text-2 hover:text-text">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-caption text-text-label uppercase tracking-[0.1em]">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {LEGAL.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="rounded-tile text-sm text-text-2 hover:text-text">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-border border-t">
          <p className="mx-auto w-full max-w-[1200px] px-4 py-4 text-caption text-text-3 sm:px-6">
            Educational information only, not financial advice. Nothing here is a recommendation to
            buy or sell any product.
          </p>
        </div>
      </footer>
    </div>
  )
}
