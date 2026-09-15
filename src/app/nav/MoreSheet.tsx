import { ChevronRight, ExternalLink, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Sheet } from '@/components/ui/Sheet'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/data/store/session'
import { APP_BASE, NAV_GROUPS } from './navigation'

/**
 * §5.2 — "More" opens a sheet containing the Tools group and Settings.
 *
 * Settings is already the last item of the TOOLS group in `navigation.ts`, so
 * this renders that group verbatim rather than keeping a second list that could
 * drift from the sidebar.
 */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const signOut = useSession((state) => state.signOut)
  const tools = NAV_GROUPS.find((group) => group.id === 'tools')

  return (
    <Sheet open={open} onClose={onClose} title="More" description="Tools and settings">
      <ul className="space-y-2">
        {(tools?.items ?? []).map((item) => (
          <li key={item.path}>
            <button
              type="button"
              onClick={() => {
                onClose()
                void navigate(item.external === true ? item.path : APP_BASE + '/' + item.path)
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-tile px-3 text-meta text-text transition-colors duration-150 hover:bg-surface-2"
            >
              <item.icon aria-hidden className="size-4 shrink-0 text-text-2" />
              <span className="flex-1 truncate text-left">{item.label}</span>
              {item.external === true ? (
                <ExternalLink aria-label="(leaves the app)" className="size-3.5 text-text-3" />
              ) : (
                <ChevronRight aria-hidden className="size-3.5 text-text-3" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* The sidebar is lg-only (§5.2), so without this the theme cannot be
          changed from any private route on a phone. */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-meta font-medium text-text">Theme</span>
        <ThemeToggle />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <AppButton
          variant="danger"
          block
          onClick={() => {
            onClose()
            signOut()
          }}
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </AppButton>
        <p className="mt-2 text-caption text-text-2">
          Signing out is what exercises the §6 guard — private routes redirect to /auth with a
          redirectTo param.
        </p>
      </div>
    </Sheet>
  )
}
